import { decode } from 'base64-arraybuffer';
// Legacy file API: simplest reliable way to read a local file as base64 for upload.
import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from '@/lib/supabase';
import { EMPTY_DOC, EMPTY_SPIN, type Project, type ProjectDoc, type ProjectPatch } from './types';

const BUCKET = 'projects';

export type ImageKind = 'original' | 'cutout' | 'export' | 'thumb';

function normalize(row: any): Project {
  return {
    ...row,
    doc: (row?.doc as ProjectDoc) ?? EMPTY_DOC,
    spin: row?.spin ?? EMPTY_SPIN,
  } as Project;
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('You must be signed in.');
  return data.user.id;
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
  // Best-effort cleanup of the project's storage folder, then delete the row.
  try {
    const userId = await currentUserId();
    const prefix = `${userId}/${id}`;
    const { data: files } = await supabase.storage.from(BUCKET).list(prefix);
    if (files && files.length > 0) {
      await supabase.storage.from(BUCKET).remove(files.map((f) => `${prefix}/${f.name}`));
    }
  } catch {
    // ignore storage cleanup failures; the row delete is what matters
  }
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

/** Upload a local image file to the project's storage folder; returns the object path. */
export async function uploadImage(
  projectId: string,
  kind: ImageKind,
  localUri: string,
  contentType: 'image/png' | 'image/jpeg' = 'image/png'
): Promise<string> {
  const userId = await currentUserId();
  const ext = contentType === 'image/jpeg' ? 'jpg' : 'png';
  const path = `${userId}/${projectId}/${kind}.${ext}`;

  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, decode(base64), { contentType, upsert: true });
  if (error) throw error;
  return path;
}

/** Create a short-lived signed URL for a private object path. */
export async function signedUrl(path: string | null, expiresInSeconds = 3600): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}
