import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { useToast } from '@/components/Toast';
import { haptics } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { useEditorStore } from './editorStore';
import { exportCanvas, type CanvasRef } from './exportImage';

/**
 * Export the canvas (share sheet or photo library). Clears any selection first
 * so the crosshair / plate handles never end up in the exported image, and
 * resets the zoom so the capture is the full composition at 1:1.
 */
export function useCanvasExport({ canvasRef, resetZoom }: { canvasRef: CanvasRef; resetZoom: () => void }) {
  const toast = useToast();
  const t = useT();
  const [exporting, setExporting] = useState(false);

  const doExport = useCallback(
    async (target: 'share' | 'save') => {
      setExporting(true);
      const s = useEditorStore.getState();
      s.setSelected(null);
      s.selectPlate(false);
      resetZoom();
      try {
        // give the canvas a frame to re-render without the selection chrome
        await new Promise((r) => setTimeout(r, 80));
        const uri = await exportCanvas(canvasRef, 'png');
        if (target === 'share') {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri);
          } else {
            toast.show(t('export.sharingUnavailable'), 'error');
          }
        } else {
          const perm = await MediaLibrary.requestPermissionsAsync();
          if (!perm.granted) {
            Alert.alert(t('export.permissionTitle'), t('export.permissionBody'));
            return;
          }
          await MediaLibrary.saveToLibraryAsync(uri);
          haptics.success();
          toast.show(t('export.savedToPhotos'), 'success');
        }
      } catch (e) {
        Alert.alert(t('export.failed'), e instanceof Error ? e.message : t('common.tryAgain'));
      } finally {
        setExporting(false);
      }
    },
    [canvasRef, resetZoom, toast, t]
  );

  const onExportPress = useCallback(() => {
    const s = useEditorStore.getState();
    if (!s.cutoutUri && !s.originalUri) return;
    Alert.alert(t('export.sheetTitle'), t('export.sheetBody'), [
      { text: t('project.share'), onPress: () => doExport('share') },
      { text: t('export.saveToPhotos'), onPress: () => doExport('save') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }, [doExport, t]);

  return { exporting, onExportPress };
}
