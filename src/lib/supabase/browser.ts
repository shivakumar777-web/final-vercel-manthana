"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "./env";

let client: SupabaseClient | undefined;

/** Returns `null` if public Supabase env is missing (avoid crashing the whole app on Vercel). */
export function createBrowserSupabaseClient(): SupabaseClient | null {
  const env = getSupabasePublicEnv();
  if (!env) return null;
  if (!client) {
    client = createBrowserClient(env.url, env.key, {
      cookieOptions: {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    });
  }
  return client;
}
