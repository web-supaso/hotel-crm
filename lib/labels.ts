export const INTERACTION_TYPES = [
  "call",
  "email",
  "meeting",
  "site_visit",
  "rfp",
  "proposal",
  "contract",
  "other",
] as const;

export const INTERACTION_DIRECTIONS = ["inbound", "outbound"] as const;

export const INTERACTION_TYPE_LABELS: Record<string, string> = {
  call: "Llamada",
  email: "Email",
  meeting: "Reunión",
  site_visit: "Visita al hotel",
  rfp: "RFP",
  proposal: "Propuesta",
  contract: "Contrato",
  other: "Otro",
};

export const SEGMENTS = [
  "Corporate events",
  "Weddings",
  "Medical conference",
  "Tour operator",
  "Leisure / individual",
  "Gratulation / dinner",
  "Other",
] as const;

export const SOURCES = ["referral", "website", "events", "inbound", "outbound", "other"] as const;

export const COMPANY_SIZES = ["1-10", "10-50", "50-250", "250-500", "500+"] as const;

export function formatCurrency(value: number | null, locale = "es-AR"): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}