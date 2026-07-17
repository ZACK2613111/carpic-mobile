// GET ?t=<token> → the shot list for the remote-capture web page.
// Deployed with --no-verify-jwt: the capture token IS the auth. The response
// only ever contains the vehicle name + slot labels + per-slot done flags —
// never paths, user ids or anything else about the project.

import { CAPTURE_SLOTS, CORS_HEADERS, json, serviceClient, validCaptureLink } from '../_shared/capture.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'GET') return json({ error: 'method not allowed' }, 405);

  const token = new URL(req.url).searchParams.get('t');
  if (!token) return json({ error: 'missing token' }, 400);

  const supabase = serviceClient();
  const link = await validCaptureLink(supabase, token);
  if (!link) return json({ error: 'invalid or expired link' }, 403);

  const [{ data: project }, { data: shots }] = await Promise.all([
    supabase.from('projects').select('name').eq('id', link.project_id).maybeSingle(),
    supabase.from('shots').select('slot, captured').eq('project_id', link.project_id),
  ]);
  const done = new Set((shots ?? []).filter((s) => s.captured).map((s) => s.slot));

  return json({
    name: project?.name ?? 'Vehicle',
    expiresAt: link.expires_at,
    slots: CAPTURE_SLOTS.map((s) => ({ ...s, done: done.has(s.id) })),
  });
});
