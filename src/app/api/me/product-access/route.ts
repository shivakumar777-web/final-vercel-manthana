import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  canAccessLabs,
  freeOracleDailyCap,
  isOracleFullTier,
  labsTrialRemainingForProfile,
  normalizeSubscriptionPlan,
} from "@/lib/product-access";

type ProfileRow = {
  subscription_status: string;
  subscription_plan: string;
  oracle_limited_day?: string | null;
  oracle_limited_used?: number | null;
  labs_free_trial_used?: number | null;
};

export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({
      labsAccess: false,
      labsTrialRemaining: null,
      oracleTier: "limited",
      oracleDailyCap: freeOracleDailyCap(),
      oracleUsedToday: 0,
      signedIn: false,
      plan: "free",
      status: "inactive",
    });
  }

  const fullSelect = await supabase
    .from("profiles")
    .select(
      "subscription_status, subscription_plan, oracle_limited_day, oracle_limited_used, labs_free_trial_used"
    )
    .eq("id", user.id)
    .single();

  let profile: ProfileRow | null = fullSelect.data as ProfileRow | null;
  if (fullSelect.error) {
    const fallback = await supabase
      .from("profiles")
      .select("subscription_status, subscription_plan")
      .eq("id", user.id)
      .single();
    profile = fallback.data
      ? {
          ...(fallback.data as ProfileRow),
          oracle_limited_day: null,
          oracle_limited_used: 0,
          labs_free_trial_used: 0,
        }
      : null;
  }

  const labs = canAccessLabs(profile);
  const trialLeft = labsTrialRemainingForProfile(profile);
  const full = isOracleFullTier(profile);
  const today = new Date().toISOString().slice(0, 10);
  const used =
    profile?.oracle_limited_day === today
      ? profile.oracle_limited_used ?? 0
      : 0;

  return NextResponse.json({
    labsAccess: labs,
    labsTrialRemaining: trialLeft,
    oracleTier: full ? "full" : "limited",
    oracleDailyCap: freeOracleDailyCap(),
    oracleUsedToday: used,
    signedIn: true,
    plan: normalizeSubscriptionPlan(profile?.subscription_plan),
    status: profile?.subscription_status ?? "inactive",
  });
}
