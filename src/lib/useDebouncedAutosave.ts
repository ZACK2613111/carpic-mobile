import { useCallback, useEffect, useRef, useState } from 'react';

export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'failed';

/**
 * Shared debounced autosave: one implementation for every screen that edits.
 *
 * - `signature` is a serialized snapshot of what would be saved; any change
 *   (while `enabled`) schedules a save after `delayMs`.
 * - The first signature seen after `enabled` flips true is adopted as the
 *   hydrated baseline — hydration itself never triggers a save.
 * - Failures retry every `retryMs` until they succeed (status: 'failed').
 * - Edits that land while a save is in flight trigger a follow-up save.
 * - Unmounting flushes immediately: navigating back inside the debounce
 *   window can no longer discard the last edit.
 */
export function useDebouncedAutosave({
  signature,
  enabled,
  save,
  delayMs = 1200,
  retryMs = 5000,
}: {
  signature: string;
  enabled: boolean;
  save: () => Promise<void>;
  delayMs?: number;
  retryMs?: number;
}): { status: AutosaveStatus; flush: () => Promise<void> } {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const savedSig = useRef<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const sigRef = useRef(signature);
  const enabledRef = useRef(enabled);
  const saveRef = useRef(save);
  sigRef.current = signature;
  enabledRef.current = enabled;
  saveRef.current = save;

  const flush = useCallback(async (): Promise<void> => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    if (!enabledRef.current || inFlight.current) return;
    if (savedSig.current === sigRef.current) return;
    inFlight.current = true;
    const sig = sigRef.current;
    setStatus('saving');
    try {
      await saveRef.current();
      savedSig.current = sig;
      inFlight.current = false;
      if (sigRef.current !== sig) {
        void flush(); // more edits arrived while saving — save again
      } else {
        setStatus('saved');
      }
    } catch {
      inFlight.current = false;
      setStatus('failed');
      retryTimer.current = setTimeout(() => void flush(), retryMs);
    }
  }, [retryMs]);

  useEffect(() => {
    if (!enabled) return;
    if (savedSig.current === null) {
      savedSig.current = signature; // hydrated baseline — nothing to save
      return;
    }
    if (signature === savedSig.current) return;
    setStatus('pending');
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => void flush(), delayMs);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [signature, enabled, delayMs, flush]);

  // Flush on unmount (back navigation) — the save itself keeps running.
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(
    () => () => {
      void flushRef.current();
    },
    []
  );

  return { status, flush };
}
