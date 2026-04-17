"use client";

import React, { useMemo, useState } from "react";
import type { InterrogatorQuestion } from "@/lib/analyse/types";

const ENGINE = {
  bgCard: "#0a1520",
  bgDeep: "#060d14",
  border: "rgba(0,180,255,0.18)",
  borderSubtle: "rgba(0,180,255,0.08)",
  textPrimary: "#e8f4ff",
  textSecondary: "#7ab3cc",
  textMuted: "#4a8fa8",
  labelMono: "#4a8fa8",
  accentCyan: "#00d4ff",
  accentTeal: "#00ffcc",
  scanGreen: "#00e87a",
} as const;

const inputStyle: React.CSSProperties = {
  marginTop: 6,
  width: "100%",
  borderRadius: 8,
  border: `1px solid ${ENGINE.border}`,
  background: ENGINE.bgDeep,
  color: ENGINE.textPrimary,
  padding: "8px 10px",
  fontSize: 13,
  fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
  outline: "none",
  boxSizing: "border-box",
};

interface Props {
  questions: InterrogatorQuestion[];
  onSubmit: (answers: Array<{ question_id: string; answer: string }>) => void;
  onCancel?: () => void;
  disabled?: boolean;
  resolvedModalityLabel: string;
  wasAutoDetected: boolean;
  detectionConfidence?: number;
}

export default function InterrogatorQA({
  questions,
  onSubmit,
  onCancel,
  disabled,
  resolvedModalityLabel,
  wasAutoDetected,
  detectionConfidence,
}: Props) {
  const [values, setValues] = useState<Record<string, string>>({});

  const sorted = useMemo(
    () => [...questions].sort((a, b) => a.id.localeCompare(b.id)),
    [questions]
  );

  const setVal = (id: string, v: string) => {
    setValues((prev) => ({ ...prev, [id]: v }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const answers = sorted.map((q) => ({
      question_id: q.id,
      answer: values[q.id] ?? "",
    }));
    onSubmit(answers);
  };

  const showConfidence =
    wasAutoDetected &&
    typeof detectionConfidence === "number" &&
    detectionConfidence >= 0 &&
    detectionConfidence <= 100;

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        width: "100%",
        maxWidth: "min(100%, 36rem)",
        padding: "12px 12px 0",
        borderRadius: 12,
        border: `1px solid ${ENGINE.border}`,
        background: ENGINE.bgCard,
        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
        boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
        minHeight: 0,
        flex: "1 1 auto",
      }}
    >
      {/* Intro — compact */}
      <div style={{ flexShrink: 0, marginBottom: 10 }}>
        <h3
          style={{
            fontFamily: "'DM Mono', ui-monospace, monospace",
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: ENGINE.labelMono,
            margin: 0,
            fontWeight: 600,
          }}
        >
          Clinical context
        </h3>
        <p
          style={{
            marginTop: 6,
            fontSize: 11,
            lineHeight: 1.45,
            color: ENGINE.textSecondary,
            marginBottom: 0,
          }}
        >
          Each answer narrows uncertainty and improves the report. Leave fields blank if unknown.
        </p>
      </div>

      {/* Modality — dense single row, minimal vertical footprint */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          borderRadius: 8,
          border: `1px solid ${ENGINE.border}`,
          background: "rgba(0,180,255,0.05)",
          borderLeft: "3px solid var(--scan-500, #00c4b0)",
          flexShrink: 0,
          marginBottom: 10,
        }}
        aria-hidden={false}
      >
        <span
          style={{
            fontSize: 14,
            color: ENGINE.accentCyan,
            lineHeight: 1,
            flexShrink: 0,
          }}
          aria-hidden
        >
          ◎
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'DM Mono', ui-monospace, monospace",
              fontSize: 8,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: ENGINE.textMuted,
              marginBottom: 2,
            }}
          >
            {wasAutoDetected ? "Modality detected" : "Analysis modality"}
          </div>
          <div
            style={{
              fontFamily: "'Syne', 'IBM Plex Sans', system-ui, sans-serif",
              fontSize: 13,
              fontWeight: 700,
              color: ENGINE.textPrimary,
              letterSpacing: "-0.02em",
              lineHeight: 1.25,
            }}
          >
            {resolvedModalityLabel}
          </div>
        </div>
        {showConfidence ? (
          <span
            style={{
              flexShrink: 0,
              fontFamily: "'DM Mono', ui-monospace, monospace",
              fontSize: 8,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              padding: "4px 8px",
              borderRadius: 20,
              border: "1px solid rgba(0,232,122,0.35)",
              background: "rgba(0,232,122,0.08)",
              color: ENGINE.scanGreen,
              whiteSpace: "nowrap",
            }}
          >
            {detectionConfidence}% confident
          </span>
        ) : null}
      </div>

      {/* Questions — no nested max-height; parent panel / sheet scrolls (better on mobile) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          paddingBottom: 8,
        }}
      >
        {sorted.map((q) => (
          <div
            key={q.id}
            style={{
              borderRadius: 8,
              border: `1px solid ${ENGINE.borderSubtle}`,
              background: ENGINE.bgDeep,
              padding: "10px 12px",
            }}
          >
            <label
              style={{
                display: "block",
                marginBottom: 2,
                fontSize: 12.5,
                fontWeight: 500,
                color: ENGINE.textPrimary,
                lineHeight: 1.45,
              }}
            >
              {q.text}
            </label>
            {q.type === "boolean" && (
              <select
                style={inputStyle}
                value={values[q.id] ?? ""}
                onChange={(e) => setVal(q.id, e.target.value)}
                disabled={disabled}
              >
                <option value="">—</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            )}
            {q.type === "select" && q.options && (
              <select
                style={inputStyle}
                value={values[q.id] ?? ""}
                onChange={(e) => setVal(q.id, e.target.value)}
                disabled={disabled}
              >
                <option value="">Select…</option>
                {q.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}
            {q.type === "text" && (
              <textarea
                style={{
                  ...inputStyle,
                  minHeight: 52,
                  resize: "vertical",
                }}
                value={values[q.id] ?? ""}
                onChange={(e) => setVal(q.id, e.target.value)}
                disabled={disabled}
                placeholder="Type your answer…"
              />
            )}
          </div>
        ))}
      </div>

      {/* Sticky actions — stay reachable while scrolling long question lists */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          zIndex: 2,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          paddingTop: 10,
          paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))",
          marginTop: 4,
          flexShrink: 0,
          background: `linear-gradient(180deg, transparent 0%, ${ENGINE.bgCard} 14%, ${ENGINE.bgCard} 100%)`,
          borderTop: `1px solid ${ENGINE.borderSubtle}`,
          marginLeft: -12,
          marginRight: -12,
          paddingLeft: 12,
          paddingRight: 12,
        }}
      >
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            style={{
              padding: "9px 16px",
              borderRadius: 8,
              border: `1px solid ${ENGINE.border}`,
              background: "transparent",
              color: ENGINE.textSecondary,
              fontSize: 13,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.5 : 1,
              fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
            }}
          >
            Back
          </button>
        )}
        <button
          type="submit"
          disabled={disabled || sorted.length === 0}
          style={{
            padding: "9px 20px",
            borderRadius: 8,
            border: "none",
            background: `linear-gradient(135deg, ${ENGINE.accentCyan}, ${ENGINE.accentTeal})`,
            color: "#020509",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "'Syne', 'IBM Plex Sans', system-ui, sans-serif",
            letterSpacing: "0.04em",
            cursor: disabled || sorted.length === 0 ? "not-allowed" : "pointer",
            opacity: disabled || sorted.length === 0 ? 0.45 : 1,
            boxShadow: "0 0 20px rgba(0,212,255,0.25)",
          }}
        >
          Continue to analysis
        </button>
      </div>
    </form>
  );
}
