/**
 * Labs scan tiers: modality → light | ct_mri | medium.
 * Pro vs Premium (Pro Plus) use the same tier split (80% / 10% / 10%) with different caps.
 */

export type LabsScanTier = "light" | "ct_mri" | "medium";

const LIGHT = new Set([
  "xray",
  "ecg",
  "dermatology",
  "lab_report",
  "oral_cancer",
]);

/** USG, mammography, pathology, cytology — shared 15/mo cap on Pro (10% bucket). */
const MEDIUM = new Set([
  "ultrasound",
  "mammography",
  "pathology",
  "cytology",
]);

/** CT + MRI (2D DICOM slices; Pro disables video upload for these in UI). */
function isCtOrMriModality(m: string): boolean {
  if (m === "ct") return true;
  if (m.startsWith("ct_")) return true;
  if (m === "brain_mri" || m === "spine_mri") return true;
  if (m === "mri") return true;
  if (m.includes("chest_ct") || m.includes("abdomen_ct") || m.includes("head_ct")) return true;
  if (m.includes("ct_") || m.includes("_ct")) return true;
  return false;
}

/**
 * Resolve tier from modality string sent to the gateway (e.g. `ct_brain`, `xray`, `chest_ct`).
 */
export function labsScanTierForModality(modalityId: string): LabsScanTier {
  const m = (modalityId || "").toLowerCase().trim();
  if (!m) return "light";
  if (MEDIUM.has(m)) return "medium";
  if (isCtOrMriModality(m)) return "ct_mri";
  if (LIGHT.has(m)) return "light";
  return "light";
}

export const PRO_LABS_LIMITS = {
  totalMonthly: 150,
  dailyMax: 15,
  lightMonthly: 120,
  ctMriMonthly: 15,
  mediumMonthly: 15,
} as const;

/** Premium (Pro Plus): same tier rules, 3× Pro monthly + higher daily cap. */
export const PREMIUM_LABS_LIMITS = {
  totalMonthly: 450,
  dailyMax: 40,
  lightMonthly: 360,
  ctMriMonthly: 45,
  mediumMonthly: 45,
} as const;

export type PaidLabsPlan = "pro" | "proplus";

export function labsLimitsForPlan(plan: PaidLabsPlan) {
  return plan === "proplus" ? PREMIUM_LABS_LIMITS : PRO_LABS_LIMITS;
}
