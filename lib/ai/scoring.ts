import { PROMPT_VERSION, buildHospitalityLeadPrompt, type HospitalityLeadPromptInput } from "./prompt";

export interface HospitalityAnalysisResult {
  intent_score: number;
  urgency: "alta" | "media" | "baja";
  summary: string;
  suggested_whatsapp_reply: string;
  key_signals: string[];
  risk_factors: string[];
  next_action: string;
  model: string;
  prompt_version: string;
}

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

export async function analyzeHospitalityLead(data: HospitalityLeadPromptInput): Promise<HospitalityAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Fallback si no hay API key configurada (para pruebas locales)
    return {
      intent_score: 75,
      urgency: "media",
      summary: `Solicitud de ${data.guestName} para ${data.propertyName ?? "alojamiento"} (${data.guestsCount} pers).`,
      suggested_whatsapp_reply: `¡Hola ${data.guestName}! Gracias por consultarnos para tu estadía del ${data.requestedCheckIn ?? "próximamente"} al ${data.requestedCheckOut ?? ""}. Tenemos disponibilidad en ${data.propertyName ?? "nuestras instalaciones"}. ¿Te gustaría que te prepare la cotización con el detalle?`,
      key_signals: ["fechas_solicitadas", "whatsapp_directo"],
      risk_factors: [],
      next_action: "Enviar cotización formal por WhatsApp",
      model: "mock-fallback",
      prompt_version: PROMPT_VERSION,
    };
  }

  const prompt = buildHospitalityLeadPrompt(data);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
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
  const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini no devolvió texto");
  }

  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned);

  return {
    intent_score: Math.max(0, Math.min(100, Math.round(Number(parsed.intent_score) || 50))),
    urgency: (["alta", "media", "baja"] as const).includes(parsed.urgency) ? parsed.urgency : "media",
    summary: String(parsed.summary || "Solicitud de reserva"),
    suggested_whatsapp_reply: String(parsed.suggested_whatsapp_reply || ""),
    key_signals: Array.isArray(parsed.key_signals) ? parsed.key_signals.map(String) : [],
    risk_factors: Array.isArray(parsed.risk_factors) ? parsed.risk_factors.map(String) : [],
    next_action: String(parsed.next_action || "Contactar al huésped"),
    model: MODEL,
    prompt_version: PROMPT_VERSION,
  };
}