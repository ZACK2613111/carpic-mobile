import { useCallback, useEffect, useState } from 'react';

import { hasSeen, markSeen } from './onboarding';

/** First-run coach-mark visibility for a given onboarding key. */
export function useCoachMarks(key: string) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    hasSeen(key).then((seen) => {
      if (!seen) setVisible(true);
    });
  }, [key]);

  const dismiss = useCallback(() => {
    setVisible(false);
    markSeen(key);
  }, [key]);

  return { visible, dismiss };
}
