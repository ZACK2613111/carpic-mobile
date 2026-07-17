import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { useToast } from '@/components/Toast';
import { haptics } from '@/lib/haptics';
import { useEditorStore } from './editorStore';
import { exportCanvas, type CanvasRef } from './exportImage';

/**
 * Export the canvas (share sheet or photo library). Clears any selection first
 * so the crosshair / plate handles never end up in the exported image, and
 * resets the zoom so the capture is the full composition at 1:1.
 */
export function useCanvasExport({ canvasRef, resetZoom }: { canvasRef: CanvasRef; resetZoom: () => void }) {
  const toast = useToast();
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
            toast.show('Sharing not available', 'error');
          }
        } else {
          const perm = await MediaLibrary.requestPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('Permission needed', 'Allow photo access to save the image.');
            return;
          }
          await MediaLibrary.saveToLibraryAsync(uri);
          haptics.success();
          toast.show('Saved to Photos', 'success');
        }
      } catch (e) {
        Alert.alert('Export failed', e instanceof Error ? e.message : 'Please try again.');
      } finally {
        setExporting(false);
      }
    },
    [canvasRef, resetZoom, toast]
  );

  const onExportPress = useCallback(() => {
    const s = useEditorStore.getState();
    if (!s.cutoutUri && !s.originalUri) return;
    Alert.alert('Export image', 'How would you like to export?', [
      { text: 'Share', onPress: () => doExport('share') },
      { text: 'Save to Photos', onPress: () => doExport('save') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [doExport]);

  return { exporting, onExportPress };
}
