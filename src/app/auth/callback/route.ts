import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/auth/safe-internal-path";
import {
  ONBOARDING_COOKIE,
  ONBOARDING_COOKIE_MAX_AGE,
} from "@/lib/auth/onboarding-cookie";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeInternalPath(searchParams.get("next"), "/");

  if (code) {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const res = NextResponse.redirect(`${origin}${next}`);
      res.cookies.set(ONBOARDING_COOKIE, "1", {
        path: "/",
        maxAge: ONBOARDING_COOKIE_MAX_AGE,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      return res;
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth`);
}
