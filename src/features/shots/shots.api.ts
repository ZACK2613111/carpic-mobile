import { coerceDoc } from '@/features/projects/types';
import { currentUserId, signedUrlFor, uploadFile } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import type { Shot, ShotPatch } from './types';

const BUCKET = 'projects';

function normalize(row: any): Shot {
  return { ...row, doc: coerceDoc(row?.doc) } as Shot;
}

export async function listShots(projectId: string): Promise<Shot[]> {
  const { data, error } = await supabase
    .from('shots')
    .select('*')
    .eq('project_id', projectId)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalize);
}

export async function getShot(id: string): Promise<Shot> {
  const { data, error } = await supabase.from('shots').select('*').eq('id', id).single();
  if (error) throw error;
  return normalize(data);
}

/** Insert-or-update a shot row keyed by (project_id, slot). */
export async function upsertShot(
  projectId: string,
  slot: string,
  section: string,
  position: number,
  patch: ShotPatch
): Promise<Shot> {
  const { data, error } = await supabase
    .from('shots')
    .upsert({ project_id: projectId, slot, section, position, ...patch }, { onConflict: 'project_id,slot' })
    .select('*')
    .single();
  if (error) throw error;
  return normalize(data);
}

export async function updateShot(id: string, patch: ShotPatch): Promise<Shot> {
  const { data, error } = await supabase.from('shots').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return normalize(data);
}

export type ShotImageKind = 'original' | 'cutout' | 'export' | 'audio';

/** Upload a shot asset to the private projects bucket; returns the object path. */
export async function uploadShotAsset(
  projectId: string,
  slot: string,
  kind: ShotImageKind,
  localUri: string,
  contentType: 'image/jpeg' | 'image/png' | 'audio/m4a' = 'image/jpeg'
): Promise<string> {
  const uid = await currentUserId();
  const ext = contentType === 'image/png' ? 'png' : contentType === 'audio/m4a' ? 'm4a' : 'jpg';
  const path = `${uid}/${projectId}/shots/${slot}/${kind}.${ext}`;
  return uploadFile(BUCKET, path, localUri, contentType);
}

export function shotSignedUrl(path: string | null): Promise<string | null> {
  return signedUrlFor(BUCKET, path);
}
