import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  labsScanTierForModality,
  labsLimitsForPlan,
  type PaidLabsPlan,
} from "@/lib/labs/modality-tier";
import { labsQuotaMessage } from "@/lib/labs/quota-messages";
import { normalizeSubscriptionPlan } from "@/lib/product-access";

type ProfileRow = {
  subscription_status: string;
  subscription_plan: string;
  labs_usage_month: string | null;
  labs_light_count: number | null;
  labs_ct_mri_count: number | null;
  labs_medium_count: number | null;
  labs_usage_day: string | null;
  labs_scans_today: number | null;
  scans_this_month: number | null;
};

function utcMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Check if next Labs scan would be allowed (no increment).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { modalityId?: string };
    const modalityId = (body.modalityId || "").trim();
    if (!modalityId) {
      return NextResponse.json({ error: "modalityId required" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: raw, error } = await supabase
      .from("profiles")
      .select(
        "subscription_status, subscription_plan, labs_usage_month, labs_light_count, labs_ct_mri_count, labs_medium_count, labs_usage_day, labs_scans_today, scans_this_month"
      )
      .eq("id", user.id)
      .single();

    if (error || !raw) {
      return NextResponse.json({ allowed: false, reason: "no_profile" }, { status: 200 });
    }

    const p = raw as ProfileRow;
    const plan = normalizeSubscriptionPlan(p.subscription_plan);
    const active = p.subscription_status === "active";

    if (!active || (plan !== "pro" && plan !== "proplus")) {
      return NextResponse.json({
        allowed: false,
        reason: "not_pro",
        message: "Active Pro or Premium subscription required for Labs scan quotas.",
      });
    }

    const paidPlan = plan as PaidLabsPlan;
    const limits = labsLimitsForPlan(paidPlan);

    const tier = labsScanTierForModality(modalityId);
    const curM = utcMonth();
    const curD = utcDay();

    let light = p.labs_light_count ?? 0;
    let ctMri = p.labs_ct_mri_count ?? 0;
    let medium = p.labs_medium_count ?? 0;
    let total = p.scans_this_month ?? 0;
    let today = p.labs_scans_today ?? 0;

    if (p.labs_usage_month !== curM) {
      light = 0;
      ctMri = 0;
      medium = 0;
      total = 0;
      today = 0;
    } else if (p.labs_usage_day !== curD) {
      today = 0;
    }

    if (today >= limits.dailyMax) {
      return NextResponse.json({
        allowed: false,
        reason: "daily_cap",
        limit: limits.dailyMax,
        message: labsQuotaMessage("daily_cap", limits.dailyMax, paidPlan),
      });
    }
    if (total >= limits.totalMonthly) {
      return NextResponse.json({
        allowed: false,
        reason: "monthly_total",
        limit: limits.totalMonthly,
        message: labsQuotaMessage("monthly_total", limits.totalMonthly, paidPlan),
      });
    }
    if (tier === "light" && light >= limits.lightMonthly) {
      return NextResponse.json({
        allowed: false,
        reason: "light_cap",
        limit: limits.lightMonthly,
        message: labsQuotaMessage("light_cap", limits.lightMonthly, paidPlan),
      });
    }
    if (tier === "ct_mri" && ctMri >= limits.ctMriMonthly) {
      return NextResponse.json({
        allowed: false,
        reason: "ct_mri_cap",
        limit: limits.ctMriMonthly,
        message: labsQuotaMessage("ct_mri_cap", limits.ctMriMonthly, paidPlan),
      });
    }
    if (tier === "medium" && medium >= limits.mediumMonthly) {
      return NextResponse.json({
        allowed: false,
        reason: "medium_cap",
        limit: limits.mediumMonthly,
        message: labsQuotaMessage("medium_cap", limits.mediumMonthly, paidPlan),
      });
    }

    return NextResponse.json({
      allowed: true,
      tier,
      plan: paidPlan,
    });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
