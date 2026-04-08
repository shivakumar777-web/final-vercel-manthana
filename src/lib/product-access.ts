/**
 * Production product gating: Labs (Manthana Radiologist) vs Oracle tiers.
 * Driven only by Supabase `profiles` — same behavior in dev and production.
 */

export type SubscriptionPlan = string;

export type ProfileAccessInput = {
  subscription_status: string;
  subscription_plan: SubscriptionPlan;
  /** Non-Pro successful Labs analyzes counted toward the lifetime free trial. */
  labs_free_trial_used?: number | null;
};

/** Lifetime free-tier Labs scans (one-time, not monthly). */
export const FREE_LABS_TRIAL_TOTAL = 3;

/** Map legacy stored plan names to current canonical ids. */
export function normalizeSubscriptionPlan(
  plan: string | null | undefined
): string {
  const p = (plan || "free").toLowerCase();
  if (p === "enterprise") return "proplus";
  return p;
}

/** Plans that unlock Manthana Labs (/analyse) and full Oracle (active subscription). */
const LABS_UNLOCK_PLANS = new Set(["pro", "proplus"]);

export function hasActiveProLabsPlan(profile: ProfileAccessInput | null): boolean {
  if (!profile) return false;
  const active = profile.subscription_status === "active";
  const plan = normalizeSubscriptionPlan(profile.subscription_plan);
  return active && LABS_UNLOCK_PLANS.has(plan);
}

/** Remaining lifetime trial scans for non-Pro users; `null` if Pro/Premium (subscription quotas apply). */
export function labsTrialRemainingForProfile(
  profile: ProfileAccessInput | null
): number | null {
  if (!profile) return null;
  if (hasActiveProLabsPlan(profile)) return null;
  const used = Math.max(0, profile.labs_free_trial_used ?? 0);
  return Math.max(0, FREE_LABS_TRIAL_TOTAL - used);
}

export function canAccessLabs(profile: ProfileAccessInput | null): boolean {
  if (!profile) return false;
  if (hasActiveProLabsPlan(profile)) return true;
  return (profile.labs_free_trial_used ?? 0) < FREE_LABS_TRIAL_TOTAL;
}

export function isOracleFullTier(profile: ProfileAccessInput | null): boolean {
  return hasActiveProLabsPlan(profile);
}

export function freeOracleDailyCap(): number {
  const raw = process.env.FREE_ORACLE_DAILY_CAP ?? "35";
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 35;
}
