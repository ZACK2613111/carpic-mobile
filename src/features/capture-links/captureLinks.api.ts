import { SUPABASE_URL } from '@/lib/env';
import { publicUrlFor } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

// Remote-capture links: the owner creates a tokenized link; the vehicle owner
// opens it in a browser (web/capture.html) and the Edge Functions do the rest.
// The token is generated server-side (schema_v4) so it's never guessable.

export type CaptureLink = {
  id: string;
  project_id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

/** The newest still-valid link for a project, or null. */
export async function getActiveCaptureLink(projectId: string): Promise<CaptureLink | null> {
  const { data, error } = await supabase
    .from('capture_links')
    .select('*')
    .eq('project_id', projectId)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createCaptureLink(projectId: string): Promise<CaptureLink> {
  const { data, error } = await supabase
    .from('capture_links')
    .insert({ project_id: projectId })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/** Reuse the active link when one exists — resending shouldn't invalidate the first. */
export async function getOrCreateCaptureLink(projectId: string): Promise<CaptureLink> {
  return (await getActiveCaptureLink(projectId)) ?? (await createCaptureLink(projectId));
}

export async function revokeCaptureLink(id: string): Promise<void> {
  const { error } = await supabase
    .from('capture_links')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Shareable URL: the static capture page (public "viewer" bucket) + the token
 * + the Edge Functions base, so the page needs zero baked-in configuration.
 */
export function captureLinkUrl(link: CaptureLink): string {
  const page = publicUrlFor('viewer', 'capture.html');
  const fns = `${SUPABASE_URL}/functions/v1`;
  return `${page}?t=${link.token}&e=${encodeURIComponent(fns)}`;
}
