"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import GoogleSignInButton from "@/components/GoogleSignInButton";

function SignUpContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const signInHref =
    callbackUrl != null && callbackUrl !== ""
      ? `/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "/sign-in";

  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/40 backdrop-blur-sm p-8 shadow-xl">
      <h1 className="font-ui text-lg tracking-[0.2em] uppercase text-gold-h mb-1">
        Sign up
      </h1>
      <p className="text-cream/50 text-sm mb-5">
        Create an account with Google. No separate email verification — Google confirms your
        identity in one step.
      </p>

      <GoogleSignInButton callbackUrl={callbackUrl} />

      <p className="mt-6 text-center text-cream/40 text-sm">
        Already have an account?{" "}
        <Link href={signInHref} className="text-gold-h hover:text-gold-p underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-white/[0.08] bg-black/40 backdrop-blur-sm p-8 shadow-xl text-center text-cream/50 text-sm">
          Loading…
        </div>
      }
    >
      <SignUpContent />
    </Suspense>
  );
}
