// Runtime environment. Expo inlines EXPO_PUBLIC_* variables at build time.

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

/** True once real Supabase credentials are present in .env. */
export const isSupabaseConfigured =
  SUPABASE_URL.startsWith('http') &&
  !SUPABASE_URL.includes('YOUR-PROJECT') &&
  SUPABASE_PUBLISHABLE_KEY.length > 10 &&
  !SUPABASE_PUBLISHABLE_KEY.includes('xxxx');
