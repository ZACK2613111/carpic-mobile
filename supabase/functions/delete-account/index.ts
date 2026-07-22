// POST (Authorization: Bearer <user JWT>) → permanently deletes the caller's
// account: all their storage objects, then the auth user itself. Every table
// (projects, shots, capture_links, custom_backgrounds, profiles) references
// auth.users ON DELETE CASCADE, so deleting the user wipes all DB rows; only
// Storage isn't cascaded, so we purge it explicitly first.
//
// Deploy WITH jwt verification (the default — do NOT pass --no-verify-jwt):
//   supabase functions deploy delete-account
//
// Google Play Data-Safety requires an in-app account-deletion path.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { CORS_HEADERS, json, serviceClient } from '../_shared/capture.ts';

const BUCKETS = ['projects', 'published'];

/** Every object key under a prefix, recursing into "folders" (entries with id === null). */
async function listAllFiles(supabase: SupabaseClient, bucket: string, prefix: string): Promise<string[]> {
  const out: string[] = [];
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error || !data) return out;
  for (const entry of data) {
    const full = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id === null) {
      out.push(...(await listAllFiles(supabase, bucket, full)));
    } else {
      out.push(full);
    }
  }
  return out;
}

async function purgeBucket(supabase: SupabaseClient, bucket: string, uid: string): Promise<void> {
  const files = await listAllFiles(supabase, bucket, uid);
  for (let i = 0; i < files.length; i += 100) {
    await supabase.storage.from(bucket).remove(files.slice(i, i + 100));
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return json({ error: 'missing bearer token' }, 401);

  const supabase = serviceClient();

  // Identify the caller from their JWT — never trust a uid from the body.
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  const uid = userData?.user?.id;
  if (userErr || !uid) return json({ error: 'invalid session' }, 401);

  // 1) Storage isn't cascaded — purge every object the user owns first.
  for (const bucket of BUCKETS) {
    try {
      await purgeBucket(supabase, bucket, uid);
    } catch {
      // best-effort: a storage hiccup must not block the account deletion itself
    }
  }

  // 2) Delete the auth user → cascades projects/shots/capture_links/etc.
  const { error: delErr } = await supabase.auth.admin.deleteUser(uid);
  if (delErr) return json({ error: 'could not delete account' }, 500);

  return json({ ok: true });
});
