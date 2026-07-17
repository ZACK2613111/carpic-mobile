import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from './supabase';

// Shared storage helpers (used by shots, spin, and publish). Uploads read a local
// file as base64 and push the decoded ArrayBuffer — the reliable path in RN.
export async function uploadFile(
  bucket: string,
  path: string,
  localUri: string,
  contentType: string
): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
  const { error } = await supabase.storage.from(bucket).upload(path, decode(base64), { contentType, upsert: true });
  if (error) throw error;
  return path;
}

export async function signedUrlFor(
  bucket: string,
  path: string | null,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}

export function publicUrlFor(bucket: string, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function currentUserId(): Promise<string> {
  // getSession reads the locally stored session (no network round-trip) —
  // getUser() hits /auth/v1/user and would fail every upload while offline.
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) throw new Error('You must be signed in.');
  return uid;
}

/**
 * Delete every object under `prefix`, descending into subfolders. Supabase's
 * `list()` is NOT recursive (folders come back as entries with no id), so a
 * flat list+remove leaves `shots/` and `spin/` subtrees orphaned — this walks
 * them. Best-effort: a failed page is skipped rather than aborting the caller.
 */
export async function removeFolder(bucket: string, prefix: string): Promise<void> {
  const { data: entries, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error || !entries || entries.length === 0) return;
  const files = entries.filter((e) => e.id).map((e) => `${prefix}/${e.name}`);
  const folders = entries.filter((e) => !e.id).map((e) => `${prefix}/${e.name}`);
  if (files.length > 0) {
    await supabase.storage.from(bucket).remove(files);
  }
  for (const folder of folders) {
    await removeFolder(bucket, folder);
  }
}
