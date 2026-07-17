import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

// React Query on RN can't detect connectivity by itself — without this, its
// "paused mutations resume when back online" behavior never actually fires.
// Also the hook point for draining the upload queue on reconnect.
export function initNetworkListener(onOnline?: () => void): () => void {
  return NetInfo.addEventListener((state) => {
    const online = Boolean(state.isConnected) && state.isInternetReachable !== false;
    onlineManager.setOnline(online);
    if (online) onOnline?.();
  });
}
