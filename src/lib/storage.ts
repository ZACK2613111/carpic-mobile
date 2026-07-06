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
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('You must be signed in.');
  return data.user.id;
}
