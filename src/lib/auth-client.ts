"use client";

/**
 * Supabase Auth — thin client compatible with prior Better Auth call sites.
 */
import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

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

  async signOut(opts?: { fetchOptions?: { onSuccess?: () => void } }) {
    const supabase = createBrowserSupabaseClient();
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
