export const INTERACTION_TYPE_LABELS: Record<string, string> = {
  whatsapp_out: "WhatsApp Enviado",
  call: "Llamada Telefónica",
  email: "Correo Electrónico",
  note: "Nota Interna",
  status_change: "Cambio de Estado",
  ai_analysis: "Análisis IA (Gemini)",
};

export const SOURCES = [
  "web_form",
  "whatsapp_inbound",
  "referral",
  "ota",
  "manual",
] as const;

export function formatCurrency(value: number | null | undefined, currency = "ARS", locale = "es-AR"): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}