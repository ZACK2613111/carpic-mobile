import { executorchEngine } from './engines/executorchEngine';
import { sixthreeEngine } from './engines/sixthreeEngine';
import type { BgRemovalEngine } from './types';

export const engines: Record<string, BgRemovalEngine> = {
  [sixthreeEngine.id]: sixthreeEngine,
  [executorchEngine.id]: executorchEngine,
};

// The engine the app uses. Swap this to change background-removal implementation.
export const activeEngine: BgRemovalEngine = sixthreeEngine;
