export const PROMPT_VERSION = "v1.0.0";

export interface Instruction {
  name: string;
  company: string | null;
  segment: string | null;
  companySize: string | null;
  lastInteractionDate: string | null;
  count: number;
  stakeholdersCount: number;
  daysInPipeline: number;
  interactions: {
    type: string;
    direction: string;
    summary: string | null;
    contactName: string | null;
    contactRole: string | null;
    occurredAt: string;
  }[];
}

export function buildLeadScoringPrompt(data: Instruction): string {
  const interactionsList = data.interactions.length
    ? data.interactions
        .map(
          (i) =>
            `- [${i.occurredAt}] ${i.type.toUpperCase()} (${i.direction}) — contact: ${i.contactName ?? "N/A"} (${i.contactRole ?? "N/A"})${i.summary ? " | " + i.summary : ""}`,
        )
        .join("\n")
    : "(none)";

  return `
You are a senior revenue intelligence analyst for a hotel/hospitality company.
Your job is to produce a rich, defensible lead assessment that sales leaders can
act on with confidence. You must reason carefully before answering.

## INTERNAL REASONING (do this first, but DO NOT output)
Before producing the final JSON, silently work through these 5 dimensions:
  1. RECENCY & FREQUENCY — How fresh and dense is the activity?
  2. INTENT SIGNALS — Are there explicit buying signals (budget, dates, RFP, contract, decision-maker)?
  3. STAKEHOLDER DEPTH — Are we talking to one person or a buying committee?
  4. ICP FIT — Does the company match our Ideal Customer Profile (size, industry, location, segment)?
  5. RISK FACTORS — Silence, objections, competitors mentioned, budget concerns, ghosting?

Resolve conflicts conservatively. When data contradicts itself, lower confidence.

## INPUT DATA
Contact name: ${data.name ?? "N/A"}
Company: ${data.company ?? "N/A"}
Company segment: ${data.segment ?? "N/A"}
Company size: ${data.companySize ?? "N/A"}
Last interaction: ${data.lastInteractionDate ?? "N/A"}
Total interactions: ${data.count}
Unique stakeholders engaged: ${data.stakeholdersCount}
Days in pipeline: ${data.daysInPipeline}
Interaction history (last 10, newest first):
${interactionsList}

## SCORING FRAMEWORK (0–100 each)

INTENT_SCORE (buying signals strength):
  0-20:  Only generic inquiries (brochure, availability)
  21-50: Dates discussed, no commitment
  51-75: Dates confirmed OR budget mentioned OR RFP sent
  76-100: Contract requested, deposit discussed, decision-maker engaged

ENGAGEMENT_SCORE (recency + frequency):
  Calculate based on interactions in last 90 days weighted by recency.
  >5 touches in 30d = 90+ | 3-5 touches = 70-89 | 1-2 touches = 40-69 | 0 = 0-39

ICP_FIT_SCORE (company alignment):
  Based on segment, company_size, and this property's ideal client mix
  (corporate events, weddings, medical conferences, premium leisure).
  Segment and/or size unknown -> do not exceed 50.

COMMITTEE_SCORE (stakeholder depth):
  1 contact = 30 | 2-3 contacts = 70 | 4+ or C-level involved = 100

RISK_PENALTY (subtract from overall):
  - No reply to 2+ messages: -15
  - >45 days silence: -20
  - Competitor mentioned: -10
  - Budget objection: -15

## CLASSIFICATION RULES (derived, not subjective)

OVERALL_SCORE = (INTENT*0.35 + ENGAGEMENT*0.25 + ICP_FIT*0.20 + COMMITTEE*0.20) - RISK_PENALTY
Clamp the result to 0-100 before classifying.

HOT:     OVERALL_SCORE >= 75 AND INTENT_SCORE >= 60
WARM:    OVERALL_SCORE 45–74
COLD:    OVERALL_SCORE < 45 OR no interactions recorded
UNKNOWN: Insufficient data (<2 interactions AND company info incomplete)

## REQUIRED OUTPUT
Return ONLY a single valid JSON object. No markdown, no code fences, no prose.
Strict keys, all present:
{
  "classification": "hot" | "warm" | "cold" | "unknown",
  "overall_score": <integer 0-100>,
  "dimension_scores": {
    "intent": <0-100>,
    "engagement": <0-100>,
    "icp_fit": <0-100>,
    "committee": <0-100>
  },
  "risk_penalty": <integer 0 to -50>,
  "confidence": <integer 0-100>,
  "predicted_close_probability": <integer 0-100>,
  "estimated_close_days": <integer or null>,
  "estimated_deal_value_signal": "high" | "medium" | "low" | "unknown",
  "priority_level": "urgent" | "high" | "medium" | "low" | "nurture",
  "next_best_action": "<one specific action, max 18 words, verb-first>",
  "follow_up_days": <integer>,
  "reasoning": "<one sentence, max 30 words, citing the top 2 drivers>",
  "key_signals": ["<max 4 short tags>"],
  "data_gaps": ["<max 3 items>"],
  "escalate_to_manager": <boolean>
}
`;
}