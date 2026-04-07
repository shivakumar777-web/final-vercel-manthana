/**
 * Next.js Middleware — Route Protection (Supabase session)
 * Redirects unauthenticated users to sign-in with callback URL
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_ROUTES = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/api/razorpay/webhook",
  "/api/supabase/auth-send-email",
  "/api/me/product-access",
  "/api/me/oracle-consume",
  "/_next",
  "/static",
  "/favicon.ico",
  "/manifest.json",
  "/logo",
  "/assets",
  "/images",
  "/fonts",
  "/",
  "/about",
  "/pricing",
  "/contact",
  "/settings",
];

const PREMIUM_ROUTES = ["/research", "/clinical", "/web", "/oracle"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => {
    if (route === "/" && pathname !== "/") return false;
    return pathname.startsWith(route);
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const { supabaseResponse, user } = await updateSession(request);

  if (isPublicRoute(pathname)) {
    supabaseResponse.headers.set("X-Frame-Options", "DENY");
    supabaseResponse.headers.set("X-Content-Type-Options", "nosniff");
    supabaseResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    return supabaseResponse;
  }

  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Sign in required." },
        { status: 401 }
      );
    }
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  supabaseResponse.headers.set("X-Frame-Options", "DENY");
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff");
  supabaseResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|css|js)$).*)",
  ],
};

export const middlewareConfig = {
  publicRoutes: PUBLIC_ROUTES,
  premiumRoutes: PREMIUM_ROUTES,
};
