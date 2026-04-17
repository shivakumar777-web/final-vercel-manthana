"use client";

import React, { useEffect, useMemo, useState } from "react";
import Logo from "./Logo";
import OracleThinking from "./OracleThinking";

const STATUS_CYCLING: Record<string, string[]> = {
  default: [
    "Consulting the ocean of knowledge…",
    "Cross-referencing traditions with modern evidence…",
    "Extracting Amrita from the knowledge ocean…",
    "Verifying sources before we speak…",
    "Almost there — distilling the nectar…",
  ],
  allopathy: [
    "Following evidence-based medicine pathways…",
    "Cross-checking guidelines and safety signals…",
    "Weighing benefit and harm for your question…",
  ],
  ayurveda: [
    "Listening in a classical Ayurvedic frame…",
    "Balancing dosha, agni, and dravya in context…",
    "Honouring the texts while checking modern safety…",
  ],
  homeopathy: [
    "Reading the symptom picture as a whole…",
    "Consulting materia medica and repertory threads…",
  ],
  siddha: [
    "Consulting Siddha classical lines…",
    "Honouring herbo-mineral wisdom and vigilance…",
  ],
  unani: [
    "Consulting Unani materia medica and temperament…",
    "Cross-walking humoral theory with safety…",
  ],
  m5: [
    "Churning five medical oceans in parallel…",
    "Waiting for each domain to answer independently…",
    "Preparing cross-system synthesis…",
  ],
  "deep-research": [
    "Spanning trials, reviews, and guidelines…",
    "Stress-testing sources for bias and contradiction…",
  ],
  search: [
    "Searching indexed medical literature…",
    "Ranking by relevance and authority…",
  ],
};

function cyclingKey(mode?: string, domain?: string): string {
  const m = (mode || "auto").toLowerCase();
  const d = (domain || "").toLowerCase();
  if (m === "m5") return "m5";
  if (m === "deep-research") return "deep-research";
  if (m === "search") return "search";
  if (d && STATUS_CYCLING[d]) return d;
  return "default";
}

interface ChurningStateProps {
  mode?: string;
  domain?: string;
}

export default function ChurningState({ mode, domain }: ChurningStateProps) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const statusKey = useMemo(() => cyclingKey(mode, domain), [mode, domain]);
  const cycling = STATUS_CYCLING[statusKey] ?? STATUS_CYCLING.default;

  useEffect(() => {
    setMsgIdx(0);
  }, [statusKey]);

  useEffect(() => {
    const t = setInterval(() => {
      setMsgIdx((i) => (i + 1) % cycling.length);
    }, 2200);
    const onTimer = setTimeout(() => setIsActive(true), 300);
    return () => {
      clearInterval(t);
      clearTimeout(onTimer);
    };
  }, [cycling.length, statusKey]);

  return (
    <div
      className="flex flex-col items-center gap-3 py-8 px-4"
      style={{ contain: "layout" }}
    >
      {/* Spinning logo — GPU layer to avoid repaint flicker */}
      <div className="relative" style={{ willChange: "transform" }}>
        <div
          style={{ animation: "rcw 3s linear infinite", display: "inline-block" }}
        >
          <Logo size="inline" animate={false} />
        </div>
        {/* Glow ring — static, no pulse to avoid flicker */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(200,146,42,0.12) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Cycling text — no key/remount, no animate-fi; update in place */}
      <p className="font-body text-xs italic text-cream/35 text-center max-w-xs min-h-[1.5rem]">
        {cycling[msgIdx % cycling.length]}
      </p>

      {/* Three dots — subtle, no animation to avoid flicker */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-gold-d opacity-60"
          />
        ))}
      </div>

      {/* ── Oracle Thinking panel ──────────────────────────────────── */}
      <OracleThinking mode={mode} domain={domain} isActive={isActive} />
    </div>
  );
}
