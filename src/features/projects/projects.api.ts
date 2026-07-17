import { currentUserId, removeFolder, signedUrlFor } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { coerceDoc, coerceSpin, type Project, type ProjectPatch } from './types';

const BUCKET = 'projects';

function normalize(row: any): Project {
  return {
    ...row,
    doc: coerceDoc(row?.doc),
    spin: coerceSpin(row?.spin),
  } as Project;
}

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalize);
}

export async function getProject(id: string): Promise<Project> {
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
  if (error) throw error;
  return normalize(data);
}

export async function createProject(name: string): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({ name })
    .select('*')
    .single();
  if (error) throw error;
  return normalize(data);
}

export async function updateProject(id: string, patch: ProjectPatch): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return normalize(data);
}

export async function deleteProject(id: string): Promise<void> {
  // Best-effort cleanup: the project's whole storage subtree (shots/, spin/ …)
  // plus its published manifest, then delete the row (which is what matters).
  try {
    const userId = await currentUserId();
    await removeFolder(BUCKET, `${userId}/${id}`);
    await removeFolder('published', `${userId}/${id}`);
  } catch {
    // ignore storage cleanup failures; the row delete is what matters
  }
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

/** Create a short-lived signed URL for a private object path. */
export function signedUrl(path: string | null, expiresInSeconds = 3600): Promise<string | null> {
  return signedUrlFor(BUCKET, path, expiresInSeconds);
}
