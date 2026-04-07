"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublishableKey, getSupabaseUrl } from "./env";

let client: SupabaseClient | undefined;

export function createBrowserSupabaseClient(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(getSupabaseUrl(), getSupabasePublishableKey(), {
      cookieOptions: {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    });
  }
  return client;
}
