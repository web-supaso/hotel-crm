import { PROMPT_VERSION, buildLeadScoringPrompt, type Instruction } from "./prompt";
import type { DimensionScores, LeadStatus } from "@/lib/types";

export interface ScoringResult {
  classification: LeadStatus;
  overall_score: number;
  dimension_scores: DimensionScores;
  risk_penalty: number;
  confidence: number;
  predicted_close_probability: number;
  estimated_close_days: number | null;
  estimated_deal_value_signal: string;
  priority_level: string;
  next_best_action: string;
  follow_up_days: number;
  reasoning: string;
  key_signals: string[];
  data_gaps: string[];
  escalate_to_manager: boolean;
  model: string;
  prompt_version: string;
}

// Gemini REST API: no SDK necesario para mantener el stack mínimo.
const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

export async function scoreLead(data: Instruction): Promise<ScoringResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no configurada");
  }

  const prompt = buildLeadScoringPrompt(data);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini error ${res.status}: ${errText.slice(0, 400)}`);
  }

  const json = await res.json();
  const text: string | undefined =
    json?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini no devolvió texto");
  }

  return normalizeResult(text);
}

function normalizeResult(text: string): ScoringResult {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned);

  const numeric = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
  };

  const classification = (["hot", "warm", "cold", "unknown"] as const).includes(
    parsed.classification,
  )
    ? (parsed.classification as LeadStatus)
    : "unknown";

  const d = parsed.dimension_scores ?? {};

  return {
    classification,
    overall_score: numeric(parsed.overall_score),
    dimension_scores: {
      intent: numeric(d.intent),
      engagement: numeric(d.engagement),
      icp_fit: numeric(d.icp_fit),
      committee: numeric(d.committee),
    },
    risk_penalty: Math.max(0, Math.min(50, Math.abs(numeric(parsed.risk_penalty)))) * -1,
    confidence: numeric(parsed.confidence),
    predicted_close_probability: numeric(parsed.predicted_close_probability),
    estimated_close_days:
      parsed.estimated_close_days == null ? null : numeric(parsed.estimated_close_days),
    estimated_deal_value_signal: parsed.estimated_deal_value_signal ?? "unknown",
    priority_level: parsed.priority_level ?? "medium",
    next_best_action: parsed.next_best_action ?? "",
    follow_up_days: numeric(parsed.follow_up_days),
    reasoning: parsed.reasoning ?? "",
    key_signals: Array.isArray(parsed.key_signals)
      ? parsed.key_signals.slice(0, 4).map(String)
      : [],
    data_gaps: Array.isArray(parsed.data_gaps) ? parsed.data_gaps.slice(0, 3).map(String) : [],
    escalate_to_manager: Boolean(parsed.escalate_to_manager),
    model: MODEL,
    prompt_version: PROMPT_VERSION,
  };
}