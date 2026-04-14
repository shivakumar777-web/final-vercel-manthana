"use client";

import React from "react";
import type { AIInterpretationReport } from "@/lib/analyse/types";
import type { ReportEnginePhase } from "@/hooks/analyse/useReportEngineLaunch";

interface Props {
  report: AIInterpretationReport;
  webSearchEnabled?: boolean;
  onNewScan?: () => void;
  /** Two-phase HTML report engine: idle → GPU wait → ready → open tab */
  reportEngine?: {
    phase: ReportEnginePhase;
    statusLine: string;
    onPrimaryClick: () => void;
  };
}

function severityClass(level: string): string {
  switch (level) {
    case "critical":
      return "bg-red-500/15 text-red-200 border-red-500/40";
    case "urgent":
      return "bg-amber-500/15 text-amber-100 border-amber-500/40";
    case "moderate":
      return "bg-sky-500/15 text-sky-100 border-sky-500/40";
    default:
      return "bg-emerald-500/10 text-emerald-100 border-emerald-500/30";
  }
}

export default function AIReportPanel({
  report,
  webSearchEnabled,
  onNewScan,
  reportEngine,
}: Props) {
  const sev = report.severity?.level || "incidental";
  const imp = report.impressions;
  const re = reportEngine;
  const connecting = re?.phase === "connecting";
  const ready = re?.phase === "ready";

  return (
    <div className="flex flex-col gap-4 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 text-[var(--foreground)]">
      <div
        className={`rounded-lg border px-3 py-2 text-sm ${severityClass(sev)}`}
      >
        <div className="font-semibold uppercase tracking-wide">
          {sev} · {report.severity?.time_sensitivity}
        </div>
        <div className="mt-1 text-xs opacity-90">
          {report.severity?.triage_action}
        </div>
      </div>

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase text-[var(--muted)]">
          Findings
        </h4>
        <ul className="space-y-2 text-sm">
          {(report.findings?.primary ?? []).map((f, i) => (
            <li
              key={i}
              className="rounded-md border border-[var(--border-subtle)] p-2"
            >
              <span className="font-medium">{f.location}</span>: {f.description}
              {f.measurement ? (
                <span className="text-[var(--muted)]"> ({f.measurement})</span>
              ) : null}
              <div className="text-xs text-[var(--muted)]">{f.significance}</div>
            </li>
          ))}
        </ul>
        {(report.findings?.negative_pertinents?.length ?? 0) > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {(report.findings?.negative_pertinents ?? []).map((n, i) => (
              <span
                key={i}
                className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]"
              >
                {n}
              </span>
            ))}
          </div>
        )}
      </section>

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase text-[var(--muted)]">
          Impressions
        </h4>
        {imp?.primary_diagnosis && (
          <div className="rounded-md border border-[var(--border-subtle)] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{imp.primary_diagnosis.name}</span>
              {imp.primary_diagnosis.icd10 && (
                <span className="rounded bg-[var(--background)] px-1.5 py-0.5 text-xs font-mono">
                  {imp.primary_diagnosis.icd10}
                </span>
              )}
              <span className="text-xs text-[var(--muted)]">
                {imp.primary_diagnosis.confidence_pct}%
              </span>
            </div>
            {imp.primary_diagnosis.evidence && (
              <p className="mt-1 text-xs text-[var(--muted)]">
                {imp.primary_diagnosis.evidence}
              </p>
            )}
          </div>
        )}
        <ul className="mt-2 space-y-1 text-sm">
          {(imp?.differentials ?? []).map((d, i) => (
            <li key={i}>
              {d.name}{" "}
              <span className="text-[var(--muted)]">({d.confidence_pct}%)</span>
              {d.reasoning && (
                <div className="text-xs text-[var(--muted)]">{d.reasoning}</div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {report.clinical_correlation && (
        <section className="text-sm">
          <h4 className="mb-1 text-xs font-semibold uppercase text-[var(--muted)]">
            Clinical correlation
          </h4>
          <p>{report.clinical_correlation.supports_history}</p>
        </section>
      )}

      <section>
        <h4 className="mb-1 text-xs font-semibold uppercase text-[var(--muted)]">
          Next steps
        </h4>
        <ul className="list-inside list-disc space-y-1 text-sm">
          {(report.next_steps ?? []).map((n, i) => (
            <li key={i}>
              <span className="font-medium">[{n.priority}]</span> {n.action} —{" "}
              {n.reasoning}
            </li>
          ))}
        </ul>
      </section>

      {(report.research_references?.length ?? 0) > 0 && (
        <section>
          <h4 className="mb-1 text-xs font-semibold uppercase text-[var(--muted)]">
            References {webSearchEnabled ? "(web)" : ""}
          </h4>
          <ul className="space-y-1 text-sm">
            {(report.research_references ?? []).map((r, i) => (
              <li key={i}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] underline"
                >
                  {r.title}
                </a>{" "}
                <span className="text-xs text-[var(--muted)]">
                  {r.journal} {r.year}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {report.indian_clinical_notes && (
        <section className="rounded-md border border-[var(--border-subtle)] p-2 text-sm">
          <h4 className="mb-1 text-xs font-semibold uppercase text-[var(--muted)]">
            Regional notes
          </h4>
          <p>{report.indian_clinical_notes}</p>
        </section>
      )}

      <footer className="border-t border-[var(--border)] pt-2 text-xs text-[var(--muted)]">
        {report.disclaimer}
        {report.models_used && report.models_used.length > 0 && (
          <div className="mt-1 font-mono text-[10px] opacity-70">
            {report.models_used.join(" · ")}
          </div>
        )}
      </footer>

      {re && (
        <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-3">
          {(connecting || ready) && re.statusLine ? (
            <p
              className={`font-mono text-[10px] tracking-wide ${connecting ? "uppercase text-[var(--muted)]" : "text-[var(--accent)]"}`}
            >
              {re.statusLine}
            </p>
          ) : null}
          <button
            type="button"
            disabled={connecting}
            onClick={re.onPrimaryClick}
            className="w-full rounded-md bg-[var(--accent)] px-3 py-2.5 text-sm font-semibold text-[var(--accent-fg)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {connecting
              ? "Preparing report engine…"
              : ready
                ? "Open HTML report engine"
                : "✦ Generate Report"}
          </button>
        </div>
      )}

      {onNewScan && (
        <button
          type="button"
          onClick={onNewScan}
          className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
        >
          New scan
        </button>
      )}
    </div>
  );
}
