"use client";

import React, { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { useToast } from "@/hooks/useToast";
import { SCANS_LIMIT_UNLIMITED_SENTINEL } from "@/lib/razorpay/client";
import { PREMIUM_LABS_LIMITS, PRO_LABS_LIMITS } from "@/lib/labs/modality-tier";

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
  scans: number;
  highlighted?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "forever",
    scans: 10,
    features: [
      "10 scans per month",
      "Oracle free tier + M5 (five medical traditions)",
      "3 lifetime Manthana Labs trial scans when signed in",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 399,
    period: "month",
    scans: PRO_LABS_LIMITS.totalMonthly,
    highlighted: true,
    features: [
      `${PRO_LABS_LIMITS.totalMonthly} Labs scans/month (max ${PRO_LABS_LIMITS.dailyMax}/day, UTC)`,
      "Tier caps: 120 light (X-ray, ECG, derm, lab, oral) · 15 CT/MRI · 15 USG + mammo + pathology + cytology",
      "Pro: 2D uploads only for CT/MRI/USG-style modalities (no video files)",
      "Manthana Labs + full Oracle (M5, clinical)",
      "Multi-model analysis",
      "Priority support",
    ],
  },
  {
    id: "proplus",
    name: "Pro Plus",
    price: 4999,
    period: "month",
    scans: PREMIUM_LABS_LIMITS.totalMonthly,
    features: [
      `${PREMIUM_LABS_LIMITS.totalMonthly} Labs scans/month (max ${PREMIUM_LABS_LIMITS.dailyMax}/day, UTC)`,
      `Same tier rules as Pro: ${PREMIUM_LABS_LIMITS.lightMonthly} light · ${PREMIUM_LABS_LIMITS.ctMriMonthly} CT/MRI · ${PREMIUM_LABS_LIMITS.mediumMonthly} medium (USG, mammo, path, cyto)`,
      "Video uploads where supported (no Pro-only 2D restriction)",
      "Everything in Pro (Oracle, multi-model, priority)",
      "Org-wide seats, SLA, compliance, custom integrations (where contracted)",
    ],
  },
];

function subscriptionPlanLabel(plan: string): string {
  const p = (plan || "free").toLowerCase();
  if (p === "enterprise" || p === "proplus") return "PRO PLUS";
  if (p === "basic") return "BASIC";
  return p.toUpperCase();
}

/** Match legacy `enterprise` stored plan to Pro Plus card. */
function canonicalSubscriptionPlanId(plan: string): string {
  const p = (plan || "free").toLowerCase();
  if (p === "enterprise") return "proplus";
  return p;
}

interface LabsUsagePayload {
  plan?: "pro" | "proplus";
  dailyMax?: number;
  lightCap?: number;
  ctMriCap?: number;
  mediumCap?: number;
  monthlyCap?: number;
  lightUsed: number;
  lightRemaining: number;
  ctMriUsed: number;
  ctMriRemaining: number;
  mediumUsed: number;
  mediumRemaining: number;
  totalUsed: number;
  totalRemaining: number;
  todayUsed: number;
  todayRemaining: number;
  pro2dOnly?: boolean;
}

interface SubscriptionData {
  status: string;
  plan: string;
  subscriptionId?: string;
  expiresAt?: number;
  scansUsed: number;
  scansLimit: number;
  scansRemaining: number;
  labsUsage?: LabsUsagePayload | null;
}

export default function SubscriptionCard() {
  const { data: session } = authClient.useSession();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  const user = session?.user as any;

  // Fetch current subscription status
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const res = await fetch("/api/razorpay/checkout");
        if (res.ok) {
          const data = await res.json();
          setSubscriptionData(data);
        }
      } catch (error) {
        console.error("Failed to fetch subscription:", error);
      } finally {
        setSubscriptionLoading(false);
      }
    };

    if (user) {
      fetchSubscription();
    }
  }, [user]);

  const normalizeLimit = (n: number | undefined) =>
    n != null && n >= SCANS_LIMIT_UNLIMITED_SENTINEL ? Infinity : (n ?? 10);

  // Fallback to session data if API call fails
  const currentPlan = subscriptionData?.plan || user?.subscriptionPlan || "free";
  const currentPlanCanonical = canonicalSubscriptionPlanId(currentPlan);
  const isActive = subscriptionData?.status === "active" || user?.subscriptionStatus === "active";
  const scansUsed = subscriptionData?.scansUsed || user?.scansThisMonth || 0;
  const scansLimit = normalizeLimit(subscriptionData?.scansLimit ?? user?.scansLimit);
  const scansRemaining =
    scansLimit === Infinity
      ? Infinity
      : Math.max(0, scansLimit - scansUsed);
  const usagePercent = scansLimit === Infinity ? 0 : Math.min(100, (scansUsed / scansLimit) * 100);

  const handleSubscribe = async (planId: string) => {
    if (planId === "free") return;

    const rzpKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!rzpKey) {
      addToast("Payments are not configured (missing NEXT_PUBLIC_RAZORPAY_KEY_ID).", "warning", 8000);
      return;
    }

    setLoading(true);
    try {
      // Create checkout session
      const res = await fetch("/api/razorpay/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create checkout");
      }

      const { subscriptionId } = await res.json();

      // Load Razorpay script if not already loaded
      if (!(window as any).Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.async = true;
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      // Initialize Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: subscriptionId,
        name: "Manthana Labs",
        description: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan Subscription`,
        prefill: {
          email: user?.email,
          name: user?.name,
        },
        theme: {
          color: "#00c8b4",
        },
        handler: function () {
          addToast("Payment received. Activating your plan…", "success", 6000);
          window.location.reload();
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error: unknown) {
      console.error("Subscription error:", error);
      const msg = error instanceof Error ? error.message : "Failed to start checkout. Please try again.";
      addToast(msg, "error", 8000);
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? You'll keep access until the end of your billing period.")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/razorpay/cancel", {
        method: "POST",
      });

      if (res.ok) {
        addToast("Subscription cancelled. Access continues until the end of the billing period.", "success", 8000);
        window.location.reload();
      } else {
        const error = await res.json();
        throw new Error(error.error || "Failed to cancel subscription");
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to cancel subscription. Please try again.";
      addToast(msg, "error", 8000);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="rounded-lg bg-white/[0.03] border border-white/[0.08] p-4">
        <p className="text-cream/50 text-center">Please sign in to view subscription</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="rounded-lg bg-white/[0.03] border border-white/[0.08] p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-cream/50 uppercase tracking-wider mb-1">Current Plan</p>
            <div className="flex items-center gap-2">
              <span
                className={`font-ui text-[10px] tracking-[0.3em] uppercase px-4 py-1.5 rounded-full border ${
                  isActive
                    ? "border-gold/30 bg-gold/[0.08] text-gold-h"
                    : "border-white/[0.12] bg-white/[0.04] text-cream/50"
                }`}
              >
                {subscriptionPlanLabel(currentPlan)}
              </span>
              {isActive && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              )}
            </div>
          </div>
          {isActive && currentPlan !== "free" && (
            <button
              onClick={handleCancel}
              disabled={loading}
              className="text-xs text-red-400 hover:text-red-300 underline transition-colors"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Usage Bar */}
        {scansLimit !== Infinity && (
          <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04] mb-3">
            <div className="flex justify-between mb-2">
              <span className="font-ui text-[10px] text-cream/35">Monthly scans</span>
              <span className="font-ui text-[10px] text-gold/70">
                {scansUsed} / {scansLimit}
              </span>
            </div>
            <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-gold-d to-gold-h rounded-full shadow-sm shadow-gold/20 transition-all duration-500"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <p className="font-ui text-[9px] text-cream/15 mt-2">
              {scansRemaining} scans remaining this month
            </p>
          </div>
        )}

        {scansLimit === Infinity && (
          <p className="text-xs text-emerald-400/70">Unlimited scans available</p>
        )}

        {subscriptionData?.labsUsage &&
          (currentPlanCanonical === "pro" || currentPlanCanonical === "proplus") &&
          isActive && (
          <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04] mt-3 text-[10px] text-cream/45 space-y-1">
            <p className="font-ui text-[9px] uppercase tracking-wider text-cream/35 mb-1">
              {subscriptionData.labsUsage.plan === "proplus" ? "Premium Labs" : "Pro Labs"} (this
              month · UTC)
            </p>
            <p>
              Today: {subscriptionData.labsUsage.todayUsed}/
              {subscriptionData.labsUsage.dailyMax ?? PRO_LABS_LIMITS.dailyMax} · Total:{" "}
              {subscriptionData.labsUsage.totalUsed}/
              {subscriptionData.labsUsage.monthlyCap ?? PRO_LABS_LIMITS.totalMonthly}
            </p>
            <p>
              Light: {subscriptionData.labsUsage.lightUsed}/
              {subscriptionData.labsUsage.lightCap ?? PRO_LABS_LIMITS.lightMonthly} · CT/MRI:{" "}
              {subscriptionData.labsUsage.ctMriUsed}/
              {subscriptionData.labsUsage.ctMriCap ?? PRO_LABS_LIMITS.ctMriMonthly} · Medium:{" "}
              {subscriptionData.labsUsage.mediumUsed}/
              {subscriptionData.labsUsage.mediumCap ?? PRO_LABS_LIMITS.mediumMonthly}
            </p>
          </div>
        )}

        {subscriptionData?.expiresAt != null && (
          <p className="text-xs text-cream/40 mt-2">
            Renews:{" "}
            {new Date(subscriptionData.expiresAt * 1000).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Plan Selection */}
      {subscriptionLoading ? (
        <div className="text-center text-cream/50 text-sm">Loading plans...</div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {PLANS.map((plan) => {
            const isCurrentPlan = currentPlanCanonical === plan.id;
            const isPlanActive = isCurrentPlan && isActive;

            return (
              <div
                key={plan.id}
                className={`rounded-xl border p-4 relative transition-all ${
                  plan.highlighted
                    ? "border-gold/40 bg-gold/[0.05]"
                    : "border-white/[0.08] bg-white/[0.02]"
                } ${isPlanActive ? "ring-1 ring-emerald-400/50" : ""}`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-2 left-4 bg-gold/20 text-gold text-[10px] px-2 py-0.5 rounded">
                    POPULAR
                  </span>
                )}

                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-ui text-sm uppercase tracking-wider text-cream mb-1">
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-semibold text-cream">
                        {plan.price === 0 ? "Free" : `₹${plan.price}`}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-cream/50 text-xs">/{plan.period}</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => !isCurrentPlan && handleSubscribe(plan.id)}
                    disabled={loading || isPlanActive}
                    className={`py-2 px-4 rounded-lg text-xs font-ui uppercase tracking-wider transition-all ${
                      isPlanActive
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default"
                        : plan.highlighted
                        ? "bg-gold/20 text-gold border border-gold/40 hover:bg-gold/30"
                        : "bg-white/[0.05] text-cream border border-white/[0.12] hover:bg-white/[0.08]"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isPlanActive
                      ? "Current Plan"
                      : isCurrentPlan && !isActive
                      ? "Reactivate"
                      : loading
                      ? "Processing..."
                      : plan.price === 0
                      ? "Free"
                      : "Subscribe"}
                  </button>
                </div>

                <ul className="space-y-1.5 mt-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="text-xs text-cream/70 flex items-center gap-2">
                      <span className="text-emerald-400">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Info */}
      <p className="text-[10px] text-cream/30 text-center">
        Secure payments via Razorpay • Cancel anytime • SSL encrypted
      </p>
    </div>
  );
}
