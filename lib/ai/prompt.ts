export const PROMPT_VERSION = "v3.0.0-hospitality";

export interface HospitalityLeadPromptInput {
  guestName: string;
  propertyName?: string | null;
  requestedCheckIn?: string | null;
  requestedCheckOut?: string | null;
  guestsCount: number;
  petsCount: number;
  experienceLevel?: string | null;
  dietaryNotes?: string | null;
  specialRequests?: string | null;
  estimatedBudget?: number | null;
  status: string;
  source: string;
  daysSinceCreation: number;
  interactions: {
    type: string;
    summary: string;
    occurredAt: string;
  }[];
}

export function buildHospitalityLeadPrompt(data: HospitalityLeadPromptInput): string {
  const interactionsFormatted = data.interactions.length
    ? data.interactions
        .map((i) => `- [${i.occurredAt}] ${i.type.toUpperCase()}: ${i.summary}`)
        .join("\n")
    : "(Sin interacciones previas registradas)";

  return `
Actúa como Asistente Senior de Revenue e Inteligencia Comercial para una cadena de Hoteles y Refugios de Experiencias/Glamping.
Tu objetivo es analizar la solicitud de este huésped/lead y generar un diagnóstico comercial preciso y un borrador de respuesta para WhatsApp.

## DATOS DEL LEAD / SOLICITUD
- Huésped: ${data.guestName}
- Propiedad/Destino de interés: ${data.propertyName ?? "No especificado"}
- Fechas solicitadas: ${data.requestedCheckIn ?? "A definir"} al ${data.requestedCheckOut ?? "A definir"}
- Cantidad de huéspedes: ${data.guestsCount}
- Mascotas: ${data.petsCount > 0 ? `${data.petsCount} mascota(s)` : "Sin mascotas"}
- Nivel de experiencia / Paquete: ${data.experienceLevel ?? "Estándar"}
- Dietas / Alergias: ${data.dietaryNotes ?? "Ninguna"}
- Peticiones especiales: ${data.specialRequests ?? "Ninguna"}
- Presupuesto estimado: ${data.estimatedBudget ? `$${data.estimatedBudget}` : "No informado"}
- Estado actual: ${data.status} | Canal: ${data.source}
- Días en el pipeline: ${data.daysSinceCreation}

## HISTORIAL DE INTERACCIONES
${interactionsFormatted}

## CRITERIOS DE EVALUACIÓN
1. INTENCIÓN DE COMPRA (0-100): Fechas definidas (+30), huéspedes claros (+20), petición concreta (+25), interacción reciente (+25).
2. NIVEL DE URGENCIA: "alta" (check-in en <7 días o solicita dispo hoy), "media" (check-in en 8-30 días), "baja" (>30 días o fechas flexibles).
3. RESUMEN CLAVE: 1 frase concisa con lo más importante que el recepcionista/vendedor debe saber.
4. RESPUESTA SUGERIDA WHATSAPP: Mensaje empático, cálido y profesional en español rioplatense/latinoamericano, mencionando el nombre del huésped, las fechas y confirmando detalles como mascotas o dietas si existen.

## FORMATO DE SALIDA REQUERIDO
Devuelve ÚNICAMENTE un objeto JSON válido sin bloques markdown ni texto adicional:
{
  "intent_score": <entero 0-100>,
  "urgency": "alta" | "media" | "baja",
  "summary": "<máximo 25 palabras resumiendo la solicitud>",
  "suggested_whatsapp_reply": "<mensaje listo para enviar por WhatsApp>",
  "key_signals": ["<tag1>", "<tag2>"],
  "risk_factors": ["<riesgo1 si existe>"],
  "next_action": "<acción concreta recomendada para el vendedor>"
}
`;
}