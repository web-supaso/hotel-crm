/**
 * Utilidades para formateo de teléfonos y enlaces inteligentes de WhatsApp
 * Soporta números de España (+34), Francia (+33), Portugal (+351), UK (+44), Argentina (+54), etc.
 */

export function formatWhatsAppNumber(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";

  // Remover prefijo internacional 00 si existe (ej. 0034 -> 34)
  const normalized = digits.replace(/^00/, "");

  // Prefijos internacionales reconocidos directamente (Europa, Américas, etc.)
  // España (34), Francia (33), Portugal (351), UK (44), Italia (39), Alemania (49), Suiza (41), USA/Canadá (1)
  if (/^(34|33|351|44|39|49|41|1|52|55|56|57|58|598|595|591|51|506|507)\d{7,14}$/.test(normalized)) {
    return normalized;
  }

  // Argentina: Formato móvil requerido para wa.me (549 + código de área + número)
  if (normalized.startsWith("549")) return normalized;
  if (normalized.startsWith("54") && normalized.length >= 12) return "549" + normalized.slice(2);
  if (normalized.length === 10) return "549" + normalized;

  return normalized;
}

export function buildWhatsAppLink(
  phone: string,
  guestName: string,
  propertyName?: string | null,
  checkIn?: string | null,
  checkOut?: string | null,
  nights: number = 0,
  suggestedReply?: string | null
): string {
  const cleanPhone = formatWhatsAppNumber(phone);
  if (!cleanPhone) return "#";

  if (suggestedReply && suggestedReply.trim()) {
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(suggestedReply)}`;
  }

  const nightsText = nights > 0 ? ` (${nights} ${nights === 1 ? "noche" : "noches"})` : "";
  const datesText = checkIn ? ` para las fechas del ${checkIn} al ${checkOut || "..."}${nightsText}` : "";
  const propertyText = propertyName ? ` en ${propertyName}` : " en Experiencias con Estilo";

  const defaultMsg = `Hola ${guestName || ""}, te escribo del equipo de Concierge de Experiencias con Estilo respecto a tu solicitud de estancia${propertyText}${datesText}. ¿Cómo podemos ayudarte con los detalles de tu llegada?`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(defaultMsg)}`;
}
