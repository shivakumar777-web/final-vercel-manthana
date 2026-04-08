"use client";

/**
 * Supabase Auth — thin client compatible with prior Better Auth call sites.
 */
import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { SUPABASE_AUTH_DISABLED_MESSAGE } from "@/lib/supabase/env";
import { safeInternalPath } from "@/lib/auth/safe-internal-path";

function displayName(user: User | null | undefined): string | undefined {
  if (!user) return undefined;
  const meta = user.user_metadata as { full_name?: string; name?: string } | undefined;
  return meta?.full_name ?? meta?.name ?? user.email?.split("@")[0];
}

/** Session shape expected by Sidebar / Settings (`session.user`, optional `user.name`). */
function withDisplayName(session: Session | null): Session | null {
  if (!session?.user) return session;
  const u = session.user;
  const name = displayName(u);
  return {
    ...session,
    user: Object.assign(u, { name: name ?? u.email }),
  };
}

export function useSession(): {
  data: Session | null;
  isPending: boolean;
} {
  const [session, setSession] = useState<Session | null>(null);
  const [isPending, setPending] = useState(true);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setSession(null);
      setPending(false);
      return;
    }
    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        setSession(withDisplayName(s));
        setPending(false);
      })
      .catch(() => setPending(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(withDisplayName(s));
    });

    return () => subscription.unsubscribe();
  }, []);

  return { data: session, isPending };
}

export async function getSession(): Promise<{ data: { session: Session | null } }> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    return { data: { session: null } };
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return { data: { session: withDisplayName(session) } };
}

type EmailCb = {
  onSuccess?: () => void;
  onError?: (ctx: { error: { message: string } }) => void;
};

export const authClient = {
  useSession,

  getSession,

  /**
   * Google OAuth — user is sent to Google, then back to `/auth/callback`.
   * Enable the provider in Supabase Dashboard → Authentication → Providers → Google.
   */
  async signInWithGoogle(options?: { callbackUrl?: string | null }) {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      return { error: new Error(SUPABASE_AUTH_DISABLED_MESSAGE) };
    }
    const next = safeInternalPath(options?.callbackUrl ?? "/", "/");
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          prompt: "select_account",
        },
      },
    });
    if (error) return { error };
    if (data?.url && typeof window !== "undefined") {
      window.location.assign(data.url);
    }
    return { error: null };
  },

  async signOut(opts?: { fetchOptions?: { onSuccess?: () => void } }) {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      opts?.fetchOptions?.onSuccess?.();
      return;
    }
    await supabase.auth.signOut({ scope: "local" });
    opts?.fetchOptions?.onSuccess?.();
  },

  signIn: {
    async email(
      {
        email,
        password,
      }: {
        email: string;
        password: string;
        callbackURL?: string;
      },
      callbacks?: EmailCb
    ) {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        const err = new Error(SUPABASE_AUTH_DISABLED_MESSAGE);
        callbacks?.onError?.({ error: { message: err.message } });
        return { data: null, error: err };
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        callbacks?.onError?.({ error: { message: error.message } });
        return { data: null, error };
      }
      callbacks?.onSuccess?.();
      return { data, error: null };
    },
  },

  signUp: {
    async email(
      {
        email,
        password,
        name,
      }: {
        email: string;
        password: string;
        name: string;
        callbackURL?: string;
      },
      callbacks?: EmailCb
    ) {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        const err = new Error(SUPABASE_AUTH_DISABLED_MESSAGE);
        callbacks?.onError?.({ error: { message: err.message } });
        return { data: null, error: err };
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name, name },
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback?next=/`
              : undefined,
        },
      });
      if (error) {
        callbacks?.onError?.({ error: { message: error.message } });
        return { data: null, error };
      }
      callbacks?.onSuccess?.();
      return { data, error: null };
    },
  },

  async resetPasswordForEmail(
    email: string,
    options?: { redirectTo?: string }
  ) {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      throw new Error(SUPABASE_AUTH_DISABLED_MESSAGE);
    }
    const redirectTo =
      options?.redirectTo ??
      (typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : undefined);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) throw new Error(error.message);
  },
};
