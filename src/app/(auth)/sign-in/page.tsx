"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import GoogleSignInButton from "@/components/GoogleSignInButton";

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const signUpHref =
    callbackUrl != null && callbackUrl !== ""
      ? `/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "/sign-up";

  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/40 backdrop-blur-sm p-8 shadow-xl">
      <h1 className="font-ui text-lg tracking-[0.2em] uppercase text-gold-h mb-1">
        Sign in
      </h1>
      <p className="text-cream/50 text-sm mb-5">
        Sign in with the Google account you used to register. Same button works for new and
        returning users.
      </p>

      <GoogleSignInButton callbackUrl={callbackUrl} />

      <p className="mt-6 text-center text-cream/40 text-sm">
        Don&apos;t have an account?{" "}
        <Link href={signUpHref} className="text-gold-h hover:text-gold-p underline underline-offset-2">
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-white/[0.08] bg-black/40 backdrop-blur-sm p-8 shadow-xl text-center text-cream/50 text-sm">
          Loading…
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
