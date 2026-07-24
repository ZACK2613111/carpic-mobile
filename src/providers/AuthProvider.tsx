import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { clearAppCache } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';

// Lets the OAuth browser tab hand control back to the app when it redirects (web).
WebBrowser.maybeCompleteAuthSession();

const LAST_USER_KEY = 'auth:last-user-id';

/** Social sign-in providers we offer. Supabase names Microsoft "azure". */
export type SocialProvider = 'google' | 'apple' | 'azure';

type SignUpResult = { session: Session | null; needsConfirmation: boolean };

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithProvider: (provider: SocialProvider) => Promise<boolean>;
  sendEmailCode: (email: string) => Promise<void>;
  verifyEmailCode: (email: string, code: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<SignUpResult>;
  resetPassword: (email: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const explicitSignOut = useRef(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) setSession(data.session);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'SIGNED_OUT') {
        // Wipe the cache only on an explicit sign-out. A refresh-token hiccup on
        // flaky 3G must not destroy the offline cache — server data stays safe
        // behind RLS, and the SIGNED_IN guard below covers account switching.
        if (explicitSignOut.current) clearAppCache();
      } else if (event === 'SIGNED_IN' && nextSession?.user) {
        // A different account taking over must never see the previous account's
        // cached projects — compare with the last known user and wipe if needed.
        const uid = nextSession.user.id;
        void AsyncStorage.getItem(LAST_USER_KEY)
          .then(async (prev) => {
            if (prev && prev !== uid) await clearAppCache();
            await AsyncStorage.setItem(LAST_USER_KEY, uid);
          })
          .catch(() => {});
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      async signInWithProvider(provider) {
        // OAuth without changing the client's global flow: open the provider in a
        // browser tab, then read the session back from the redirect URL. Uses the
        // implicit flow (tokens in the URL hash), so no PKCE/client changes.
        const redirectTo = Linking.createURL('auth-callback');
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo, skipBrowserRedirect: true },
        });
        if (error) throw error;
        if (!data?.url) throw new Error('OAuth: no authorization URL returned');
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type !== 'success' || !result.url) return false; // user dismissed the sheet
        const returned = new URL(result.url);
        const raw = (returned.hash || returned.search).replace(/^[#?]/, '');
        const params = new URLSearchParams(raw);
        const errorDescription = params.get('error_description');
        if (errorDescription) throw new Error(errorDescription);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (!access_token || !refresh_token) throw new Error('OAuth: no session returned');
        const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
        if (sessionError) throw sessionError;
        return true;
      },
      async sendEmailCode(email) {
        // Passwordless: Supabase emails a login code (and/or magic link).
        const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
        if (error) throw error;
      },
      async verifyEmailCode(email, code) {
        const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
        if (error) throw error;
      },
      async signUp(email, password, displayName) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        });
        if (error) throw error;
        // When email confirmation is OFF, Supabase returns an active session and
        // the user is already signed in. When it's ON, there's no session yet and
        // they must confirm their email first.
        return { session: data.session, needsConfirmation: !data.session };
      },
      async resetPassword(email) {
        // Sends a recovery email. Completing it in-app (a set-new-password screen
        // via a PASSWORD_RECOVERY deep link) needs Supabase redirect config —
        // Phase 2; the emailed link already lets the user reset.
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
      },
      async deleteAccount() {
        // The Edge Function purges storage + deletes the auth user (cascading
        // every DB row). functions.invoke attaches the caller's access token.
        const { error } = await supabase.functions.invoke('delete-account');
        if (error) throw error;
        // The server user is gone — clear the local session + cache like an
        // explicit sign-out so no stale data lingers.
        explicitSignOut.current = true;
        try {
          await supabase.auth.signOut();
        } finally {
          explicitSignOut.current = false;
        }
      },
      async signOut() {
        explicitSignOut.current = true;
        try {
          await supabase.auth.signOut();
        } finally {
          explicitSignOut.current = false;
        }
      },
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
