"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Domain- and mode-specific “thinking” lines — tuned to feel like real retrieval + reasoning,
 * not a generic stub. Keys must match DomainPills ids + mode + search + deep-research.
 */
const THOUGHT_SEQUENCES: Record<string, string[]> = {
  allopathy: [
    "Parsing your question for clinical intent and urgency…",
    "Aligning with evidence-based medicine (EBM) and safety-first review…",
    "Pulling PubMed-indexed literature and guideline abstracts…",
    "Cross-checking WHO, ICMR, and major society recommendations…",
    "Grading evidence strength — RCT → systematic review → meta-analysis…",
    "Scanning for contraindications, black-box warnings, and interactions…",
    "Checking renal/hepatic adjustments, pregnancy, and lactation flags…",
    "Weighing benefit vs. harm for the scenario you described…",
    "Composing Amrita — the distilled evidence response…",
  ],
  ayurveda: [
    "Listening in a roga–rogi frame — disease and person together…",
    "Considering Prakriti, Vikruti, Agni, and Srotas in context…",
    "Consulting Brihat/Laghu Trayi lines and classical indications…",
    "Cross-referencing AYUSH pharmacopoeia and Dravyaguna (Rasa–Virya–Vipaka)…",
    "Balancing Shamana vs. Shodhana and Panchakarma relevance…",
    "Flagging herb–drug interactions and documented contraindications…",
    "Cross-checking classical use with modern pharmacology where it helps…",
    "Composing Amrita — the distilled Ayurvedic response…",
  ],
  homeopathy: [
    "Identifying the characteristic symptom picture and modalities…",
    "Consulting Materia Medica and repertory rubrics for the case…",
    "Evaluating potency, repetition, and posology conventions…",
    "Cross-checking provings and clinical materia for consistency…",
    "Screening for red flags that need urgent conventional care…",
    "Weighing chronic vs. acute prescribing and follow-up cues…",
    "Composing Amrita — the distilled homeopathic response…",
  ],
  siddha: [
    "Consulting Siddha classical sources and Siddha Materia Medica…",
    "Evaluating Mukkuttram — Vali, Azhal, Iyam — and Naadi context…",
    "Reviewing herbo-mineral (Rasa Ulgam) preparations and safety…",
    "Cross-referencing Gunapadam and traditional Siddha formulations…",
    "Flagging metal/mineral toxicity and dosage vigilance…",
    "Integrating Siddha diet and lifestyle (Pathyam) cues…",
    "Composing Amrita — the distilled Siddha response…",
  ],
  unani: [
    "Consulting Ilmul Advia and Unani pharmacopoeia traditions…",
    "Evaluating Mizaj (temperament) and Tabiyat in context…",
    "Cross-referencing Ibn Sina’s principles with modern safety data…",
    "Reviewing compound formulations (Murakkabat) and single drugs…",
    "Checking for herb–drug overlap and contraindicated combinations…",
    "Aligning with CCRUM and recognised Unani references…",
    "Composing Amrita — the distilled Unani response…",
  ],
  m5: [
    "Opening the Manthana Samudra — five knowledge oceans in parallel…",
    "Initialising Allopathy thread — PubMed, trials, and guideline mesh…",
    "Initialising Ayurveda thread — classical texts and AYUSH lines…",
    "Initialising Homeopathy thread — materia medica and repertory…",
    "Initialising Siddha thread — herbo-mineral and classical formulations…",
    "Initialising Unani thread — humoral theory and pharmacopoeia…",
    "Awaiting domain streams — each system answers independently…",
    "Cross-walking safety signals across all five traditions…",
    "Spotting agreement, tension, and contraindications between systems…",
    "Weaving integrative synthesis — not a mere concatenation…",
    "Distilling Amrita — nectar from five churnings…",
  ],
  "deep-research": [
    "Initialising Med Deep Research protocol…",
    "Spanning indexed literature, guidelines, and trial registries…",
    "Pulling systematic reviews and meta-analyses where available…",
    "Fetching latest clinical trial data (ClinicalTrials.gov)…",
    "Cross-referencing Cochrane, NICE, WHO, and national bodies…",
    "Contrasting traditional-system claims with evidence strength…",
    "Running bias and contradiction passes across sources…",
    "Building multi-system synthesis matrix…",
    "Distilling final evidence-ranked response…",
  ],
  search: [
    "Formulating semantic medical search across indexed sources…",
    "Ranking hits by relevance, domain fit, and authority…",
    "De-duplicating and clustering near-duplicate results…",
    "Extracting snippets and citations for transparency…",
    "Composing Manthana Web search summary…",
  ],
};

const PANEL_LABELS: Record<string, string> = {
  m5: "M5 · Five oceans in parallel",
  "deep-research": "Deep research · multi-source synthesis",
  search: "Manthana Web · literature scan",
  allopathy: "Allopathy · evidence & safety",
  ayurveda: "Ayurveda · classical & integrative",
  homeopathy: "Homeopathy · materia medica",
  siddha: "Siddha · classical & herbo-mineral",
  unani: "Unani · humoral pharmacology",
};

function resolveThoughtKey(mode: string | undefined, domain: string | undefined): string {
  const m = (mode || "auto").toLowerCase();
  const d = (domain || "").toLowerCase();

  if (m === "m5") return "m5";
  if (m === "deep-research") return "deep-research";
  if (m === "search") return "search";

  if (d && THOUGHT_SEQUENCES[d]) return d;
  if (m === "auto" || !d) return "allopathy";
  return "allopathy";
}

function getThoughtSequence(mode: string | undefined, domain: string | undefined): string[] {
  const key = resolveThoughtKey(mode, domain);
  return THOUGHT_SEQUENCES[key] ?? THOUGHT_SEQUENCES.allopathy;
}

function getPanelLabel(mode: string | undefined, domain: string | undefined): string {
  const key = resolveThoughtKey(mode, domain);
  return PANEL_LABELS[key] ?? "Oracle · synthesising response";
}

const THOUGHT_ICONS = ["◈", "◉", "◎", "◇", "✦", "⬡", "◐", "⬢"];

interface OracleThinkingProps {
  mode?: string;
  domain?: string;
  isActive: boolean;
}

export default function OracleThinking({
  mode = "auto",
  domain,
  isActive,
}: OracleThinkingProps) {
  const [visibleThoughts, setVisibleThoughts] = useState<
    { text: string; icon: string; id: number; completed: boolean }[]
  >([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const thoughtsEndRef = useRef<HTMLDivElement>(null);

  const thoughts = useMemo(() => getThoughtSequence(mode, domain), [mode, domain]);
  const thoughtSessionKey = `${mode ?? ""}|${domain ?? ""}|${thoughts.length}`;

  const panelLabel = useMemo(() => getPanelLabel(mode, domain), [mode, domain]);

  /* Reset thought stream when domain/mode changes or panel reactivates */
  useEffect(() => {
    if (!isActive) return;
    setVisibleThoughts([]);
    setCurrentIdx(0);
    setCharCount(0);
  }, [isActive, thoughtSessionKey]);

  /* Typewriter effect for current thought */
  useEffect(() => {
    if (!isActive || currentIdx >= thoughts.length) return;
    const currentText = thoughts[currentIdx];

    if (charCount < currentText.length) {
      const t = setTimeout(
        () => setCharCount((c) => c + 1),
        16 + Math.random() * 14
      );
      return () => clearTimeout(t);
    }

    setVisibleThoughts((prev) => {
      const updated = [...prev];
      const existing = updated.findIndex((t) => t.id === currentIdx);
      if (existing >= 0) {
        updated[existing] = { ...updated[existing], completed: true };
        return updated;
      }
      return updated;
    });

    const advance = setTimeout(() => {
      setCurrentIdx((i) => i + 1);
      setCharCount(0);
    }, 480);
    return () => clearTimeout(advance);
  }, [isActive, charCount, currentIdx, thoughts]);

  /* Add new thought entry when currentIdx advances */
  useEffect(() => {
    if (!isActive || currentIdx >= thoughts.length) return;
    const icon = THOUGHT_ICONS[currentIdx % THOUGHT_ICONS.length];
    setVisibleThoughts((prev) => {
      if (prev.find((t) => t.id === currentIdx)) return prev;
      return [...prev, { text: "", icon, id: currentIdx, completed: false }];
    });
  }, [currentIdx, isActive, thoughts]);

  /* Update the in-progress thought text */
  useEffect(() => {
    if (!isActive) return;
    setVisibleThoughts((prev) =>
      prev.map((t) =>
        t.id === currentIdx
          ? { ...t, text: thoughts[currentIdx]?.slice(0, charCount) ?? "" }
          : t
      )
    );
  }, [charCount, currentIdx, isActive, thoughts]);

  useEffect(() => {
    thoughtsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleThoughts]);

  if (!isActive || visibleThoughts.length === 0) return null;

  return (
    <div
      className="oracle-thinking-panel"
      style={{
        width: "100%",
        maxWidth: "480px",
        margin: "12px auto 0",
        borderRadius: "12px",
        border: "1px solid rgba(200,146,42,0.18)",
        background:
          "linear-gradient(135deg, rgba(2,6,16,0.92) 0%, rgba(10,24,58,0.88) 100%)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        overflow: "hidden",
        boxShadow:
          "0 0 0 1px rgba(200,146,42,0.06), 0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(200,146,42,0.08)",
      }}
    >
      <button
        type="button"
        onClick={() => setIsExpanded((x) => !x)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "9px 14px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          borderBottom: isExpanded
            ? "1px solid rgba(200,146,42,0.10)"
            : "none",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background: "var(--gold)",
            animation: "oracleThinkDot 1.4s ease-in-out infinite",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "2px",
            flex: 1,
            textAlign: "left",
          }}
        >
          <span
            style={{
              fontFamily: "Optima, Candara, 'Century Gothic', Verdana, sans-serif",
              fontSize: "10px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(200,146,42,0.75)",
              fontWeight: 500,
            }}
          >
            Oracle is thinking
          </span>
          <span
            style={{
              fontFamily:
                "'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif",
              fontSize: "10px",
              letterSpacing: "0.06em",
              color: "rgba(245,240,232,0.38)",
              fontWeight: 400,
            }}
          >
            {panelLabel}
          </span>
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{
            transform: isExpanded ? "rotate(180deg)" : "rotate(0)",
            transition: "transform 0.25s ease",
            opacity: 0.4,
          }}
        >
          <path
            d="M2 4.5L6 8.5L10 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isExpanded && (
        <div
          style={{
            maxHeight: "210px",
            overflowY: "auto",
            padding: "10px 14px 12px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            scrollbarWidth: "none",
          }}
        >
          {visibleThoughts.map((thought) => (
            <div
              key={thought.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                animation: thought.id > 0 ? "oracleThoughtRise 0.3s ease forwards" : undefined,
                opacity: thought.completed ? 0.42 : 1,
                transition: "opacity 0.4s ease",
              }}
            >
              <span
                style={{
                  color: thought.completed
                    ? "rgba(200,146,42,0.35)"
                    : "rgba(200,146,42,0.9)",
                  fontSize: "10px",
                  lineHeight: "18px",
                  flexShrink: 0,
                  fontFamily: "monospace",
                  transition: "color 0.3s",
                }}
              >
                {thought.completed ? "✓" : thought.icon}
              </span>

              <span
                style={{
                  fontFamily:
                    "'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif",
                  fontSize: "11.5px",
                  lineHeight: "1.55",
                  color: thought.completed
                    ? "rgba(245,240,232,0.28)"
                    : "rgba(245,240,232,0.78)",
                  transition: "color 0.4s",
                  letterSpacing: "0.01em",
                }}
              >
                {thought.text}
                {!thought.completed && (
                  <span
                    style={{
                      display: "inline-block",
                      width: "1px",
                      height: "12px",
                      background: "var(--gold)",
                      marginLeft: "2px",
                      verticalAlign: "middle",
                      animation: "oracleThinkCursor 0.9s step-end infinite",
                    }}
                  />
                )}
              </span>
            </div>
          ))}
          <div ref={thoughtsEndRef} />
        </div>
      )}
    </div>
  );
}
