"use client";
import { useState, useLayoutEffect, useEffect } from "react";

const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  laptop: 1024,
  desktop: 1280,
} as const;

/**
 * Labs / analyse layout: single column + bottom sheet when width ≤ 1024px.
 * (Previously only isMobile||isTablet left 769–1024px on “desktop” layout — wrong for phones in landscape, small tablets, etc.)
 */
export interface MediaQueryState {
  isMobile: boolean;
  isTablet: boolean;
  isLaptop: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  width: number;
  /** True for phone, tablet, small laptop, narrow windows — use for Manthana Labs chrome */
  isCompactLayout: boolean;
}

/** Matches server + first client paint — mobile-first (avoids desktop flash on phones / pull-to-refresh). */
const MOBILE_FIRST: MediaQueryState = {
  isMobile: true,
  isTablet: false,
  isLaptop: false,
  isDesktop: false,
  isTouch: true,
  width: 390,
  isCompactLayout: true,
};

function computeMediaState(): MediaQueryState {
  const w = Math.round(
    typeof window !== "undefined"
      ? window.visualViewport?.width ?? window.innerWidth
      : 390
  );
  const isMobile = w <= BREAKPOINTS.mobile;
  const isTablet = w > BREAKPOINTS.mobile && w <= BREAKPOINTS.tablet;
  const isLaptop = w > BREAKPOINTS.tablet && w <= BREAKPOINTS.laptop;
  const isDesktop = w > BREAKPOINTS.laptop;
  const isTouch =
    typeof navigator !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);
  const isCompactLayout = w <= BREAKPOINTS.laptop;
  return {
    isMobile,
    isTablet,
    isLaptop,
    isDesktop,
    isTouch,
    width: w,
    isCompactLayout,
  };
}

export function useMediaQuery(): MediaQueryState {
  const [state, setState] = useState<MediaQueryState>(MOBILE_FIRST);

  useLayoutEffect(() => {
    setState(computeMediaState());
  }, []);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    function scheduleUpdate() {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setState(computeMediaState());
      }, 50);
    }

    function updateNow() {
      clearTimeout(timeout);
      setState(computeMediaState());
    }

    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("orientationchange", updateNow);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", scheduleUpdate);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("orientationchange", updateNow);
      vv?.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  return state;
}

export { BREAKPOINTS };
