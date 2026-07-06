import { useCallback, useState } from 'react';

import { activeEngine } from './registry';

export type BgStatus = 'idle' | 'removing' | 'done' | 'error';

export function useBackgroundRemoval() {
  const [status, setStatus] = useState<BgStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const remove = useCallback(async (imageUri: string): Promise<string> => {
    setError(null);
    setStatus('removing');
    try {
      const result = await activeEngine.removeBackground(imageUri);
      setStatus('done');
      return result.uri;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Background removal failed';
      setError(message);
      setStatus('error');
      throw e;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return { status, error, remove, reset, engineName: activeEngine.name };
}
