/** localStorage: times user dismissed the PWA install nudge without installing */
export const PWA_NUDGE_COUNT_KEY = "manthana_pwa_nudge_count";
/** localStorage: user opted out of further nudges */
export const PWA_NUDGE_DISMISSED_KEY = "manthana_pwa_nudge_dismissed_forever";
export const MAX_PWA_NUDGES = 5;

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

/**
 * Show install nudge only on real mobile / tablet contexts (not desktop Chrome resized narrow).
 * Aligns with Labs `isCompactLayout` (≤1024px) + touch or mobile UA.
 */
export function isMobileForPwaNudge(): boolean {
  if (typeof window === "undefined") return false;
  if (isStandalonePwa()) return false;
  const w = Math.round(window.visualViewport?.width ?? window.innerWidth);
  const narrow = w <= 1024;
  if (!narrow) return false;
  const touchLike =
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(hover: none)").matches;
  const uaMobile =
    typeof navigator !== "undefined" &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  return touchLike || uaMobile;
}

export function isIosLike(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function readNudgeCount(): number {
  try {
    const v = localStorage.getItem(PWA_NUDGE_COUNT_KEY);
    const n = v ? parseInt(v, 10) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function incrementNudgeCount(): number {
  const next = Math.min(MAX_PWA_NUDGES, readNudgeCount() + 1);
  try {
    localStorage.setItem(PWA_NUDGE_COUNT_KEY, String(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function readDismissedForever(): boolean {
  try {
    return localStorage.getItem(PWA_NUDGE_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setDismissedForever(): void {
  try {
    localStorage.setItem(PWA_NUDGE_DISMISSED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearNudgeState(): void {
  try {
    localStorage.removeItem(PWA_NUDGE_COUNT_KEY);
    localStorage.removeItem(PWA_NUDGE_DISMISSED_KEY);
  } catch {
    /* ignore */
  }
}

export function shouldShowPwaNudge(): boolean {
  if (!isMobileForPwaNudge() || isStandalonePwa()) return false;
  if (readDismissedForever()) return false;
  return readNudgeCount() < MAX_PWA_NUDGES;
}
