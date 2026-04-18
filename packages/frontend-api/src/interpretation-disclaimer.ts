import type { StructuredInterpretationDisclaimer } from "./types";

export function formatInterpretationDisclaimer(
  d: string | StructuredInterpretationDisclaimer | undefined | null
): string {
  if (d == null) return "";
  if (typeof d === "string") return d.trim();
  const parts = [d.text?.trim(), d.regulatory_note?.trim()].filter(Boolean) as string[];
  const meta = [d.version ? `v${d.version}` : "", d.generated_at_utc || ""].filter(Boolean);
  if (meta.length) {
    parts.push(meta.join(" · "));
  }
  return parts.join("\n\n");
}
