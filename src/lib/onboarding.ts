import AsyncStorage from '@react-native-async-storage/async-storage';

// Tiny persistence for "have they seen this coach mark / hint yet".
export async function hasSeen(key: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(`carstudio.seen.${key}`)) === '1';
  } catch {
    return false;
  }
}

export async function markSeen(key: string): Promise<void> {
  try {
    await AsyncStorage.setItem(`carstudio.seen.${key}`, '1');
  } catch {
    // ignore
  }
}
