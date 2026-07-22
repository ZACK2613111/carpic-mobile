/**
 * End-to-end Supabase smoke test — exercises every backend operation the app
 * relies on (auth, project CRUD, photo upload, signed URLs, shots, spin +
 * the raise_spin_frame_count RPC, manifest publish) against a REAL project,
 * then cleans up. Read-world validation for "does the backend actually work".
 *
 * Usage:
 *   node scripts/smoke-supabase.mjs
 *
 * Requires a .env (or real env vars):
 *   EXPO_PUBLIC_SUPABASE_URL=...
 *   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
 * Optional (recommended — a pre-confirmed test account so we don't create users):
 *   SMOKE_EMAIL=...            SMOKE_PASSWORD=...
 *
 * Prerequisites on the project: schema.sql … schema_v6.sql run in order;
 * storage buckets `projects` + `published` created; email confirmation OFF
 * (or a confirmed SMOKE_EMAIL/PASSWORD supplied).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// --- tiny .env loader (no dependency) ---
function loadEnv() {
  try {
    const raw = readFileSync(join(ROOT, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    // no .env — rely on real env vars
  }
}
loadEnv();

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!URL || !KEY) {
  console.error('✗ Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (create .env).');
  process.exit(2);
}

// 1×1 transparent PNG — a valid image payload for upload tests.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

const supabase = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const results = [];
async function step(name, fn, { critical = true } = {}) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail });
    console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
    return true;
  } catch (e) {
    const msg = e?.message ?? String(e);
    results.push({ name, ok: false, critical, detail: msg });
    console.log(`${critical ? '✗' : '⊘'} ${name} — ${msg}`);
    return false;
  }
}

async function removeFolder(bucket, prefix) {
  const { data } = await supabase.storage.from(bucket).list(prefix, { limit: 100 });
  const files = (data ?? []).map((f) => `${prefix}/${f.name}`);
  if (files.length) await supabase.storage.from(bucket).remove(files);
}

let uid = null;
let projectId = null;
let shotPath = null;

async function main() {
  console.log(`\nSupabase smoke test → ${URL}\n`);

  // ---- auth ----
  await step('auth: sign in / sign up', async () => {
    const email = process.env.SMOKE_EMAIL;
    const password = process.env.SMOKE_PASSWORD;
    if (email && password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      uid = data.user?.id;
      return `signed in as ${email}`;
    }
    const rnd = `smoke_${Date.now()}@carstudio.test`;
    const { data, error } = await supabase.auth.signUp({ email: rnd, password: 'Test123456!' });
    if (error) throw error;
    if (!data.session) throw new Error('signed up but no session — email confirmation is ON. Disable it or set SMOKE_EMAIL/PASSWORD.');
    uid = data.user?.id;
    return `created ${rnd}`;
  });
  if (!uid) return finish();

  // ---- projects CRUD ----
  await step('projects: insert', async () => {
    const { data, error } = await supabase.from('projects').insert({ name: 'Smoke Test Car' }).select('*').single();
    if (error) throw error;
    projectId = data.id;
    if (data.user_id && data.user_id !== uid) throw new Error('user_id not set to caller');
    return `id=${projectId}`;
  });
  if (!projectId) return finish();

  // ---- storage: photo upload ----
  await step('storage: upload photo (projects bucket)', async () => {
    shotPath = `${uid}/${projectId}/shots/front/original.png`;
    const { error } = await supabase.storage.from('projects').upload(shotPath, PNG, { contentType: 'image/png', upsert: true });
    if (error) throw error;
    return shotPath;
  });

  await step('storage: create signed URL', async () => {
    const { data, error } = await supabase.storage.from('projects').createSignedUrl(shotPath, 3600);
    if (error) throw error;
    if (!data?.signedUrl) throw new Error('no signed URL');
    return 'ok';
  });

  // ---- shots ----
  await step('shots: upsert', async () => {
    const { error } = await supabase
      .from('shots')
      .upsert(
        { project_id: projectId, slot: 'front', section: 'exterior', position: 0, image_path: shotPath, captured: true },
        { onConflict: 'project_id,slot' }
      )
      .select('*')
      .single();
    if (error) throw error;
    return 'front';
  });

  await step('shots: list', async () => {
    const { data, error } = await supabase.from('shots').select('*').eq('project_id', projectId);
    if (error) throw error;
    return `${data?.length ?? 0} row(s)`;
  });

  // ---- spin ----
  await step('projects: save spin (jsonb)', async () => {
    const spin = { frameCount: 0, hasCutout: false, backgroundId: 'transparent', hotspots: [] };
    const { error } = await supabase.from('projects').update({ spin }).eq('id', projectId);
    if (error) throw error;
    return 'ok';
  });

  await step('storage: upload spin frame', async () => {
    const { error } = await supabase.storage
      .from('projects')
      .upload(`${uid}/${projectId}/spin/frame_000.jpg`, PNG, { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
    return 'frame_000';
  });

  await step('rpc: raise_spin_frame_count (schema_v6)', async () => {
    const { error } = await supabase.rpc('raise_spin_frame_count', { p_project_id: projectId, p_min: 1 });
    if (error) throw error;
    const { data } = await supabase.from('projects').select('spin').eq('id', projectId).single();
    const n = data?.spin?.frameCount;
    if (n !== 1) throw new Error(`frameCount=${n}, expected 1`);
    return 'frameCount → 1';
  }, { critical: false }); // fails loudly if schema_v6 isn't deployed yet

  // ---- publish (manifest to published bucket) ----
  await step('storage: publish manifest (published bucket)', async () => {
    const manifest = Buffer.from(JSON.stringify({ name: 'Smoke Test Car', shots: [] }), 'utf8');
    const { error } = await supabase.storage
      .from('published')
      .upload(`${uid}/${projectId}/manifest.json`, manifest, { contentType: 'application/json', upsert: true });
    if (error) throw error;
    return 'ok';
  }, { critical: false });

  await step('projects: read back', async () => {
    const { data, error } = await supabase.from('projects').select('*').eq('id', projectId).single();
    if (error) throw error;
    return `name="${data.name}"`;
  });

  // ---- cleanup ----
  await step('cleanup: storage + project row', async () => {
    await removeFolder('projects', `${uid}/${projectId}/shots/front`);
    await removeFolder('projects', `${uid}/${projectId}/spin`);
    await removeFolder('published', `${uid}/${projectId}`).catch(() => {});
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) throw error;
    return 'removed';
  }, { critical: false });

  finish();
}

function finish() {
  const pass = results.filter((r) => r.ok).length;
  const critFail = results.filter((r) => !r.ok && r.critical);
  const softFail = results.filter((r) => !r.ok && !r.critical);
  console.log(`\n— ${pass}/${results.length} passed, ${critFail.length} critical failure(s), ${softFail.length} non-critical —`);
  if (softFail.length) console.log('  non-critical:', softFail.map((r) => r.name).join(', '));
  console.log(uid ? '' : '\nNote: the test user is left in place (deleting an auth user needs the service_role key).');
  process.exit(critFail.length ? 1 : 0);
}

main().catch((e) => {
  console.error('unexpected:', e);
  process.exit(1);
});
