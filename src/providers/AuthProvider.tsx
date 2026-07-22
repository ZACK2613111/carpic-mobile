import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { clearAppCache } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';

const LAST_USER_KEY = 'auth:last-user-id';

type SignUpResult = { session: Session | null; needsConfirmation: boolean };

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<SignUpResult>;
  resetPassword: (email: string) => Promise<void>;
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
