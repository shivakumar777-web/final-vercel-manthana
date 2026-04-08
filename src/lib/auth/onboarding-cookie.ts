/** Cookie set when user finishes or skips intro — middleware uses it to route `/` → sign-in vs `/welcome`. */
export const ONBOARDING_COOKIE = "manthana_onboarding_done";

export const ONBOARDING_COOKIE_MAX_AGE = 60 * 60 * 24 * 400; // ~400 days
