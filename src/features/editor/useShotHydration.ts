import { useEffect, useRef } from 'react';

import { getSlot } from '@/features/capture/shotTemplate';
import { shotSignedUrl } from '@/features/shots/shots.api';
import type { Shot } from '@/features/shots/types';
import { useEditorStore } from './editorStore';

/**
 * Hydrate the editor store from a shot row (signed URLs + doc). Runs once per
 * shot id; a store already hydrated for this shot (e.g. returning from another
 * screen) is left untouched so in-flight edits are never clobbered.
 */
export function useShotHydration(shot: Shot | undefined, reloadKey = 0) {
  const load = useEditorStore((s) => s.load);
  const storeProjectId = useEditorStore((s) => s.projectId);
  const hydrated = useEditorStore((s) => s.hydrated);
  const hydratedRef = useRef<string | null>(null);
  const reloadRef = useRef(reloadKey);

  useEffect(() => {
    // A bumped reloadKey (e.g. the user retrying after a failed image load)
    // forces a fresh hydrate; harmless no-op while the key never changes.
    if (reloadRef.current !== reloadKey) {
      reloadRef.current = reloadKey;
      hydratedRef.current = null;
    }
    if (!shot) return;
    if (storeProjectId === shot.id && hydrated) {
      hydratedRef.current = shot.id;
      return;
    }
    if (hydratedRef.current === shot.id) return;
    hydratedRef.current = shot.id;

    (async () => {
      const [orig, cut] = await Promise.all([
        shotSignedUrl(shot.image_path),
        shotSignedUrl(shot.cutout_path),
      ]);
      load({
        projectId: shot.id,
        name: getSlot(shot.slot)?.label ?? 'Shot',
        mode: 'marketing',
        backgroundId: shot.background_id,
        originalUri: orig,
        cutoutUri: cut,
        hotspots: shot.doc?.hotspots ?? [],
        shadow: shot.doc?.shadow,
        plate: shot.doc?.plate,
        bounds: shot.doc?.bounds,
      });
    })();
  }, [shot, storeProjectId, hydrated, load, reloadKey]);
}
