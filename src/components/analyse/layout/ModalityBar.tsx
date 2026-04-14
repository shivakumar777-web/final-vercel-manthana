"use client";
import React, {
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { AI_ORCHESTRATION_ENABLED, MODALITIES } from "@/lib/analyse/constants";
import type { Modality } from "@/lib/analyse/types";
import { useMediaQuery } from "@/hooks/analyse/useMediaQuery";
import { useProductAccess } from "@/components/ProductAccessProvider";

interface Props {
  activeModality: string;
  onSelect: (id: string) => void;
}

/** Volumetric PRO / Premium CT — single “3D Premium” group in the UI. */
const PREMIUM_3D_IDS = new Set(["ct_brain_vista", "premium_ct_unified"]);

/* ── Per-modality accent colors for glow ── */
const MODALITY_COLORS: Record<string, string> = {
  auto: "0,196,176", // teal
  xray: "100,180,255", // ice blue
  ct: "180,140,255", // purple (legacy)
  ct_abdomen: "180,140,255",
  ct_chest: "200,160,255",
  ct_cardiac: "255,120,160",
  ct_spine: "140,180,255",
  ct_brain: "160,200,255",
  ct_brain_vista: "255,200,120",
  premium_ct_unified: "255,180,90",
  brain_mri: "0,196,176",
  spine_mri: "0,170,160",
  mri: "0,196,176", // legacy id if present in history
  ultrasound: "100,220,200", // seafoam
  ecg: "255,100,120", // rose
  pathology: "200,160,80", // amber
  mammography: "255,140,200", // pink
  cytology: "140,200,255", // sky
  oral_cancer: "255,160,100", // coral
  lab_report: "120,220,160", // mint
  dermatology: "200,120,200", // orchid
};

const DEFAULT_COLOR = "0,196,176";

type OpenGroup = "12d" | "3d" | null;

interface MenuLayout {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

export default function ModalityBar({ activeModality, onSelect }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const trigger12dRef = useRef<HTMLButtonElement>(null);
  const trigger3dRef = useRef<HTMLButtonElement>(null);

  const [openGroup, setOpenGroup] = useState<OpenGroup>(null);
  const [menuLayout, setMenuLayout] = useState<MenuLayout | null>(null);
  const [mounted, setMounted] = useState(false);
  const [search12d, setSearch12d] = useState("");

  const { isMobile, isTablet, isTouch, width: vw } = useMediaQuery();
  const { plan, status } = useProductAccess();
  const compact = isMobile || isTablet;
  /** Comfortable tap targets on touch hardware or small breakpoints. */
  const cozyTouch = compact || isTouch;
  const normalizedPlan = (plan || "free").toLowerCase();
  const hasPremiumCtAccess =
    status === "active" && (normalizedPlan === "premium" || normalizedPlan === "enterprise");

  useEffect(() => {
    setMounted(true);
  }, []);

  const modalities12d = useMemo(() => {
    const auto = MODALITIES.find((m) => m.id === "auto");
    const rest = MODALITIES.filter(
      (m) => m.id !== "auto" && !PREMIUM_3D_IDS.has(m.id)
    );
    const q = search12d.trim().toLowerCase();
    let list = rest;
    if (AI_ORCHESTRATION_ENABLED && q) {
      list = rest.filter(
        (m) =>
          m.label.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          (m.group && m.group.toLowerCase().includes(q))
      );
    }
    return auto ? [auto, ...list] : list;
  }, [search12d]);
  const modalities3d = useMemo(() => {
    const ordered: Modality[] = [];
    for (const id of ["ct_brain_vista", "premium_ct_unified"] as const) {
      const m = MODALITIES.find((x) => x.id === id);
      if (m) ordered.push(m);
    }
    return ordered;
  }, []);

  const activeIn12d = modalities12d.some((m) => m.id === activeModality);
  const activeIn3d = PREMIUM_3D_IDS.has(activeModality);

  const computeMenuLayout = useCallback(() => {
    if (!openGroup) return;
    const btn = openGroup === "12d" ? trigger12dRef.current : trigger3dRef.current;
    if (!btn || typeof window === "undefined") return;

    const r = btn.getBoundingClientRect();
    const margin = 8;
    /** Reserve space for home indicator / thumb + margin (env() also applied on panel). */
    const reservedBottom = 24;

    const innerW = window.innerWidth;
    const innerH = window.visualViewport?.height ?? window.innerHeight;

    let panelWidth: number;
    if (compact) {
      panelWidth = Math.min(400, innerW - margin * 2);
    } else {
      panelWidth = Math.max(280, Math.min(380, Math.max(r.width, 280)));
    }

    let left = r.left + (r.width - panelWidth) / 2;
    left = Math.max(margin, Math.min(left, innerW - panelWidth - margin));

    const gap = 6;
    let top = r.bottom + gap;
    const spaceBelow = innerH - top - reservedBottom - margin;
    const defaultMax = 380;
    let maxHeight = Math.min(defaultMax, Math.max(160, spaceBelow));

    /* If not enough space below, open above the trigger. */
    if (spaceBelow < 120 && r.top > innerH - r.bottom) {
      const maxHAbove = Math.min(defaultMax, Math.max(160, r.top - margin - reservedBottom));
      maxHeight = maxHAbove;
      top = r.top - gap - maxHeight;
      if (top < margin) {
        top = margin;
        maxHeight = Math.min(maxHeight, r.top - gap - margin);
      }
    }

    setMenuLayout({ top, left, width: panelWidth, maxHeight });
  }, [openGroup, compact]);

  useLayoutEffect(() => {
    if (!openGroup) {
      setMenuLayout(null);
      return;
    }
    computeMenuLayout();
    const onReflow = () => computeMenuLayout();
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", onReflow);
      vv.addEventListener("scroll", onReflow);
    }
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
      if (vv) {
        vv.removeEventListener("resize", onReflow);
        vv.removeEventListener("scroll", onReflow);
      }
    };
  }, [openGroup, computeMenuLayout, vw]);

  useEffect(() => {
    if (!openGroup) return;

    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (barRef.current?.contains(t) || menuPanelRef.current?.contains(t)) return;
      setOpenGroup(null);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenGroup(null);
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [openGroup]);

  const toggleGroup = useCallback((g: "12d" | "3d") => {
    setOpenGroup((prev) => {
      const next = prev === g ? null : g;
      if (next === "12d") setSearch12d("");
      return next;
    });
  }, []);

  const pickModality = useCallback(
    (m: Modality) => {
      if (m.id === "premium_ct_unified" && !hasPremiumCtAccess) return;
      onSelect(m.id);
      setOpenGroup(null);
    },
    [hasPremiumCtAccess, onSelect]
  );

  const rowMinHeight = cozyTouch ? 44 : 40;

  const renderDropdownRow = (m: Modality) => {
    const isActive = activeModality === m.id;
    const rgb = MODALITY_COLORS[m.id] || DEFAULT_COLOR;
    const vistaLocked = m.id === "premium_ct_unified" && !hasPremiumCtAccess;

    return (
      <button
        key={m.id}
        type="button"
        role="menuitem"
        onClick={() => pickModality(m)}
        disabled={vistaLocked}
        title={vistaLocked ? "Premium (₹3999) or enterprise subscription required." : m.description}
        style={{
          display: "flex",
          alignItems: "center",
          gap: cozyTouch ? 8 : 8,
          width: "100%",
          minHeight: rowMinHeight,
          textAlign: "left" as const,
          padding: cozyTouch ? "10px 14px" : "10px 14px",
          border: "none",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: isActive ? `rgba(${rgb},0.12)` : "transparent",
          cursor: vistaLocked ? "not-allowed" : "pointer",
          fontFamily: "var(--font-display)",
          fontSize: compact ? 10 : 11,
          fontWeight: isActive ? 600 : 400,
          color: vistaLocked ? "rgba(255,200,120,0.45)" : isActive ? `rgb(${rgb})` : "var(--text-55)",
          letterSpacing: "0.06em",
          textTransform: "uppercase" as const,
          opacity: vistaLocked ? 0.75 : 1,
          WebkitTapHighlightColor: "transparent",
          ...(compact
            ? {
                whiteSpace: "normal" as const,
                lineHeight: 1.25,
              }
            : { whiteSpace: "nowrap" as const }),
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: compact ? 9 : 9,
            fontWeight: 700,
            letterSpacing: "0.1em",
            opacity: isActive ? 1 : 0.75,
            flexShrink: 0,
            alignSelf: "flex-start",
            marginTop: compact ? 2 : 0,
          }}
        >
          {m.icon}
        </span>
        {!compact ? (
          <>
            <span
              style={{
                width: 1,
                height: 12,
                background: isActive ? `rgba(${rgb},0.25)` : "var(--modality-pill-separator)",
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1, minWidth: 0 }}>{m.label}</span>
            {m.id === "premium_ct_unified" ? (
              <span
                style={{
                  marginLeft: 4,
                  padding: "2px 6px",
                  borderRadius: 4,
                  fontSize: 7,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  background: hasPremiumCtAccess ? "rgba(255,180,90,0.25)" : "rgba(255,180,90,0.12)",
                  color: "rgb(255,200,120)",
                  border: "1px solid rgba(255,180,90,0.5)",
                  flexShrink: 0,
                }}
              >
                PREMIUM
              </span>
            ) : m.premium ? (
              <span
                style={{
                  marginLeft: 4,
                  padding: "2px 6px",
                  borderRadius: 4,
                  fontSize: 7,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  background: "rgba(255,200,120,0.25)",
                  color: "rgb(255,200,120)",
                  border: "1px solid rgba(255,200,120,0.4)",
                  flexShrink: 0,
                }}
              >
                PRO
              </span>
            ) : null}
          </>
        ) : (
          <span style={{ flex: 1, minWidth: 0 }}>{m.label}</span>
        )}
      </button>
    );
  };

  const groupTriggerStyle = (
    rgb: string,
    isOpen: boolean,
    isGroupActive: boolean
  ): React.CSSProperties => ({
    flex: compact ? "1 1 0" : "0 1 auto",
    minWidth: compact ? 0 : 200,
    minHeight: cozyTouch ? 44 : 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: compact ? "10px 12px" : "10px 18px",
    borderRadius: "var(--r-full)",
    border: `1px solid ${
      isOpen || isGroupActive ? `rgba(${rgb},0.45)` : "var(--modality-pill-border-idle)"
    }`,
    background:
      isOpen || isGroupActive
        ? `linear-gradient(135deg, rgba(${rgb},0.14), rgba(${rgb},0.05))`
        : "var(--modality-pill-bg-idle)",
    cursor: "pointer",
    fontFamily: "var(--font-display)",
    fontSize: compact ? 10 : 11,
    fontWeight: isGroupActive ? 600 : 500,
    color: isGroupActive ? `rgb(${rgb})` : "var(--text-55)",
    letterSpacing: compact ? "0.06em" : "0.08em",
    textTransform: "uppercase" as const,
    transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
    boxShadow:
      isOpen || isGroupActive
        ? `0 0 12px rgba(${rgb},0.15), inset 0 1px 0 rgba(${rgb},0.08)`
        : "none",
    whiteSpace: "nowrap" as const,
    WebkitTapHighlightColor: "transparent",
  });

  const menuPanel = openGroup && menuLayout && mounted && (
    <div
      ref={menuPanelRef}
      role="menu"
      style={{
        position: "fixed",
        top: menuLayout.top,
        left: menuLayout.left,
        width: menuLayout.width,
        maxHeight: menuLayout.maxHeight,
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        borderRadius: "var(--r-md)",
        border: "1px solid var(--glass-border)",
        background: "var(--modality-bar-bg)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
        zIndex: 10040,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {openGroup === "12d" ? (
        <>
          {AI_ORCHESTRATION_ENABLED && (
            <div
              style={{
                padding: "8px 12px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                position: "sticky",
                top: 0,
                background: "var(--modality-bar-bg)",
                zIndex: 1,
              }}
            >
              <input
                type="search"
                placeholder="Search modality…"
                value={search12d}
                onChange={(e) => setSearch12d(e.target.value)}
                aria-label="Filter modalities"
                style={{
                  width: "100%",
                  borderRadius: 8,
                  border: "1px solid var(--glass-border)",
                  background: "rgba(0,0,0,0.2)",
                  color: "var(--foreground)",
                  padding: "8px 10px",
                  fontSize: 12,
                }}
              />
            </div>
          )}
          {modalities12d.map((m) => renderDropdownRow(m))}
        </>
      ) : (
        modalities3d.map((m) => renderDropdownRow(m))
      )}
    </div>
  );

  return (
    <div
      ref={barRef}
      className="modality-bar no-print"
      style={{
        position: "relative",
        padding: compact
          ? "8px max(12px, env(safe-area-inset-left, 0px)) 8px max(12px, env(safe-area-inset-right, 0px))"
          : "10px max(16px, env(safe-area-inset-left, 0px)) 10px max(16px, env(safe-area-inset-right, 0px))",
        paddingBottom: compact
          ? "max(8px, env(safe-area-inset-bottom, 0px))"
          : "10px",
        borderTop: "1px solid var(--glass-border)",
        background: "var(--modality-bar-bg)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: compact ? 8 : 12,
          alignItems: "stretch",
          justifyContent: "center",
          flexWrap: "nowrap",
          maxWidth: "100%",
        }}
      >
        <div style={{ position: "relative", flex: compact ? 1 : "0 1 auto", minWidth: 0 }}>
          <button
            ref={trigger12dRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={openGroup === "12d"}
            aria-label="1D and 2D modalities"
            onClick={() => toggleGroup("12d")}
            style={groupTriggerStyle("100,180,255", openGroup === "12d", activeIn12d)}
          >
            <span
              style={
                compact
                  ? {
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      minWidth: 0,
                      maxWidth: "min(42vw, 180px)",
                    }
                  : undefined
              }
            >
              {AI_ORCHESTRATION_ENABLED ? "1D & 2D (95)" : "1D & 2D"}
            </span>
            <span style={{ fontSize: 11, opacity: 0.75, flexShrink: 0 }} aria-hidden>
              {openGroup === "12d" ? "▴" : "▾"}
            </span>
          </button>
        </div>

        <div style={{ position: "relative", flex: compact ? 1 : "0 1 auto", minWidth: 0 }}>
          <button
            ref={trigger3dRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={openGroup === "3d"}
            aria-label="3D Premium modalities"
            onClick={() => toggleGroup("3d")}
            style={groupTriggerStyle("255,180,90", openGroup === "3d", activeIn3d)}
          >
            <span
              style={
                compact
                  ? {
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      minWidth: 0,
                      maxWidth: "min(42vw, 200px)",
                    }
                  : undefined
              }
            >
              3D Premium
            </span>
            <span style={{ fontSize: 11, opacity: 0.75, flexShrink: 0 }} aria-hidden>
              {openGroup === "3d" ? "▴" : "▾"}
            </span>
          </button>
        </div>
      </div>

      {mounted && menuPanel ? createPortal(menuPanel, document.body) : null}
    </div>
  );
}
