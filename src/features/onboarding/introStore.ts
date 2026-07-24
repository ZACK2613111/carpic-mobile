import { create } from 'zustand';

import { hasSeen, markSeen } from '@/lib/onboarding';

const KEY = 'intro';

type IntroState = {
  /** null = not hydrated from storage yet. */
  seen: boolean | null;
  hydrate: () => Promise<void>;
  complete: () => Promise<void>;
};

// First-run intro onboarding flag. Reactive (Zustand) so the auth gate flips to
// sign-in the instant the user finishes, without a manual storage re-read.
export const useIntro = create<IntroState>((set) => ({
  seen: null,
  hydrate: async () => set({ seen: await hasSeen(KEY) }),
  complete: async () => {
    set({ seen: true });
    await markSeen(KEY);
  },
}));
