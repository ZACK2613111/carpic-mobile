// POST ?t=<token>&slot=<slotId> with a JPEG body → stores the photo in the
// owner's private folder and upserts the shot row, exactly like an in-app
// guided capture. Deployed with --no-verify-jwt: the capture token IS the
// auth; the anonymous visitor never touches storage or the DB directly.

import { CAPTURE_SLOTS, CORS_HEADERS, json, serviceClient, validCaptureLink } from '../_shared/capture.ts';

// Matches the app's own upload rule of thumb (photos are resized client-side).
const MAX_BYTES = 8 * 1024 * 1024;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const url = new URL(req.url);
  const token = url.searchParams.get('t');
  const slotId = url.searchParams.get('slot');
  if (!token || !slotId) return json({ error: 'missing token or slot' }, 400);

  const slot = CAPTURE_SLOTS.find((s) => s.id === slotId);
  if (!slot) return json({ error: 'unknown slot' }, 400);

  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/jpeg')) return json({ error: 'JPEG only' }, 415);

  const body = await req.arrayBuffer();
  if (body.byteLength === 0) return json({ error: 'empty body' }, 400);
  if (body.byteLength > MAX_BYTES) return json({ error: 'file too large (max 8 MB)' }, 413);

  const supabase = serviceClient();
  const link = await validCaptureLink(supabase, token);
  if (!link) return json({ error: 'invalid or expired link' }, 403);

  const path = `${link.user_id}/${link.project_id}/shots/${slot.id}/original.jpg`;
  const { error: upErr } = await supabase.storage
    .from('projects')
    .upload(path, body, { contentType: 'image/jpeg', upsert: true });
  if (upErr) return json({ error: 'upload failed' }, 500);

  const { error: rowErr } = await supabase.from('shots').upsert(
    {
      project_id: link.project_id,
      user_id: link.user_id,
      slot: slot.id,
      section: slot.section,
      position: slot.position,
      image_path: path,
      captured: true,
    },
    { onConflict: 'project_id,slot' }
  );
  if (rowErr) return json({ error: 'could not record the shot' }, 500);

  // Best-effort usage stamp — a failure here must not fail the upload.
  await supabase
    .from('capture_links')
    .update({ used_at: new Date().toISOString() })
    .eq('id', link.id);

  return json({ ok: true, slot: slot.id });
});
