// Supabase client for React Native.
// NOTE: the url-polyfill import MUST come first — supabase-js relies on the
// global URL / URLSearchParams which React Native does not ship by default.
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isSupabaseConfigured } from './env';

// Fall back to a syntactically-valid placeholder so createClient() never throws
// at import time when the app hasn't been configured yet. The UI gates real
// usage behind `isSupabaseConfigured`.
const url = isSupabaseConfigured ? SUPABASE_URL : 'https://placeholder.supabase.co';
const key = isSupabaseConfigured ? SUPABASE_PUBLISHABLE_KEY : 'placeholder-anon-key';

export const supabase = createClient(url, key, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Keep the access token fresh only while the app is in the foreground.
if (isSupabaseConfigured) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
