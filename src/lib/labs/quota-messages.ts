import {
  PREMIUM_LABS_LIMITS,
  PRO_LABS_LIMITS,
  type PaidLabsPlan,
} from "@/lib/labs/modality-tier";

/** User-facing copy for Labs quota responses (preflight + record-scan). */
export function labsQuotaMessage(
  code: string,
  limit?: number,
  plan?: PaidLabsPlan
): string {
  const isPremium = plan === "proplus";
  const brand = isPremium ? "Premium" : "Pro";
  switch (code) {
    case "daily_cap":
      return `Daily Labs limit reached (${limit ?? (isPremium ? PREMIUM_LABS_LIMITS.dailyMax : PRO_LABS_LIMITS.dailyMax)} scans per day on ${brand}).`;
    case "monthly_total":
      return `Monthly Labs limit reached (${limit ?? (isPremium ? PREMIUM_LABS_LIMITS.totalMonthly : PRO_LABS_LIMITS.totalMonthly)} scans on ${brand}).`;
    case "light_cap":
      return `${brand} light-tier limit reached (${limit ?? (isPremium ? PREMIUM_LABS_LIMITS.lightMonthly : PRO_LABS_LIMITS.lightMonthly)}/mo: X-ray, ECG, dermatology, lab reports, oral cancer, etc.).`;
    case "ct_mri_cap":
      if (isPremium) {
        return `Premium CT/MRI limit reached (${limit ?? PREMIUM_LABS_LIMITS.ctMriMonthly}/mo).`;
      }
      return `Pro CT/MRI limit reached (${limit ?? PRO_LABS_LIMITS.ctMriMonthly}/mo). Upgrade to Premium for higher limits.`;
    case "medium_cap":
      return `${brand} medium-tier limit reached (${limit ?? (isPremium ? PREMIUM_LABS_LIMITS.mediumMonthly : PRO_LABS_LIMITS.mediumMonthly)}/mo: ultrasound, mammography, pathology, cytology).`;
    case "not_pro_active":
      return "Active Pro or Premium subscription is required for Labs scans.";
    default:
      return "Labs quota exceeded.";
  }
}
