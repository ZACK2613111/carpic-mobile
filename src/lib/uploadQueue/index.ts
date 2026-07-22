import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

import { uid } from '../uid';
import { createUploadQueue, type UploadTask } from './core';

export type { EnqueueInput, UploadHandler, UploadTask } from './core';

const STORAGE_KEY = 'upload-queue:v1';
// documentDirectory (not cache): the OS may purge cache under storage pressure,
// and queued photos are the only remaining copy of the user's work.
const OUTBOX_DIR = `${FileSystem.documentDirectory}outbox/`;

async function ensureOutboxDir(): Promise<void> {
  try {
    await FileSystem.makeDirectoryAsync(OUTBOX_DIR, { intermediates: true });
  } catch {
    // already exists
  }
}

const queue = createUploadQueue({
  loadState: async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UploadTask[]) : null;
  },
  saveState: (tasks) => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)),
  stashFile: async (sourceUri, taskId) => {
    await ensureOutboxDir();
    const ext = sourceUri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const fileName = `${taskId}.${ext}`;
    await FileSystem.copyAsync({ from: sourceUri, to: OUTBOX_DIR + fileName });
    return fileName;
  },
  removeFile: (fileName) => FileSystem.deleteAsync(OUTBOX_DIR + fileName, { idempotent: true }),
  pathFor: (fileName) => OUTBOX_DIR + fileName,
  newId: uid,
  now: () => Date.now(),
  setTimer: (fn, ms) => setTimeout(fn, ms),
  clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
});

export const initUploadQueue = queue.init;
export const registerUploadHandler = queue.registerHandler;
export const enqueueUpload = queue.enqueue;
export const drainUploadQueue = queue.drain;
export const getPendingUploads = queue.getPending;
export const getFailedUploads = queue.getFailed;
export const retryFailedUploads = queue.retryFailed;
export const discardFailedUpload = queue.discardFailed;
export const subscribeUploadQueue = queue.subscribe;

/** Absolute URI of a queued task's local file — usable as an <Image> source. */
export function uploadFileUri(task: UploadTask): string {
  return OUTBOX_DIR + task.fileName;
}
