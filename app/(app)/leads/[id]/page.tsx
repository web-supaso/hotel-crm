import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate, formatDateTime, INTERACTION_TYPE_LABELS } from "@/lib/labels";
import { StatusBadge, ScoreRing } from "@/components/ui";
import type { Interaction } from "@/lib/types";
import { buildWhatsAppLink, formatWhatsAppNumber } from "@/lib/phone";
import { ArrowLeft, MessageCircle, Calendar, Users, Building2, Dog, Utensils, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [{ data: lead }, { data: interactions }] = await Promise.all([
    supabase
      .from("leads")
      .select(`
        *,
        property:properties(id, name, property_type, city),
        discard_reason:discard_reasons(id, code, label)
      `)
      .eq("id", id)
      .single(),
    supabase
      .from("interactions")
      .select("*")
      .eq("lead_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!lead) notFound();

  const interactionsList = (interactions ?? []) as Interaction[];

  const nights = (lead.requested_check_in && lead.requested_check_out)
    ? Math.max(0, Math.round((new Date(lead.requested_check_out + "T00:00:00").getTime() - new Date(lead.requested_check_in + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const whatsappUrl = buildWhatsAppLink(
    lead.guest_phone || "",
    lead.guest_name,
    lead.property?.name,
    lead.requested_check_in,
    lead.requested_check_out,
    nights,
    lead.ai_suggested_reply
  );

  return (
    <div className="max-w-5xl space-y-6">
      <Link
        href="/leads"
        className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={16} /> Volver al pipeline
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">{lead.guest_name}</h1>
            <StatusBadge status={lead.status} />
          </div>
          <p className="text-sm font-medium text-slate-600">
            Teléfono WhatsApp: <span className="text-slate-900 font-bold">{lead.guest_phone}</span> • Email: {lead.guest_email || "No informado"}
          </p>
          <p className="text-xs text-slate-400">
            Origen: {lead.source} • Creado el {formatDate(lead.created_at)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {formatWhatsAppNumber(lead.guest_phone) ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
            >
              <MessageCircle size={16} /> Abrir WhatsApp Directo
            </a>
          ) : (
            <span
              title="Sin teléfono de WhatsApp"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-400 cursor-not-allowed border border-slate-200"
            >
              <MessageCircle size={16} /> Sin WhatsApp
            </span>
          )}
        </div>
      </div>

      {/* Grid: Detalles de Hospedaje & IA Intelligence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Requerimientos de Estancia */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Calendar size={18} className="text-indigo-600" /> Requerimientos de Estadía
          </h2>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-slate-500">Propiedad de interés:</span>
              <span className="font-bold text-slate-900">
                {lead.property ? lead.property.name : "A definir"}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-slate-500">Fechas solicitadas:</span>
              <span className="font-bold text-slate-900">
                {lead.requested_check_in ? `${lead.requested_check_in} al ${lead.requested_check_out || '?'}` : "A definir"}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-slate-500">Cantidad de Huéspedes:</span>
              <span className="font-bold text-slate-900">{lead.guests_count} personas</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-slate-500">Mascotas:</span>
              <span className="font-bold text-slate-900">
                {lead.pets_count > 0 ? `${lead.pets_count} mascota(s)` : "Sin mascotas"}
              </span>
            </div>

            {(lead.dietary_notes || lead.special_requests) && (
              <div className="pt-2">
                <p className="text-xs font-bold text-slate-500 uppercase">Dietas / Peticiones Especiales</p>
                <p className="text-xs text-slate-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200/60 mt-1">
                  {lead.dietary_notes || lead.special_requests}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Diagnóstico de IA (Gemini) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles size={18} className="text-indigo-600" /> Inteligencia Comercial IA
            </h2>
            {lead.ai_intent_score && (
              <ScoreRing score={lead.ai_intent_score} size={44} />
            )}
          </div>

          <div className="space-y-3">
            <div className="rounded-xl bg-indigo-50/60 p-3 border border-indigo-100">
              <p className="text-xs font-bold text-indigo-900">Diagnóstico:</p>
              <p className="text-xs text-indigo-800 mt-0.5 leading-relaxed">
                {lead.ai_summary || "Sin diagnóstico automático."}
              </p>
            </div>

            {lead.ai_suggested_reply && (
              <div>
                <p className="text-xs font-bold text-slate-700 mb-1">Respuesta Sugerida para WhatsApp:</p>
                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-800 border border-slate-200/80 leading-relaxed font-sans">
                  {lead.ai_suggested_reply}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline de Interacciones */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-4">
          Historial & Timeline ({interactionsList.length})
        </h2>

        {interactionsList.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">Sin interacciones registradas aún.</p>
        ) : (
          <div className="space-y-3">
            {interactionsList.map((i) => (
              <div key={i.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="h-2 w-2 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      {INTERACTION_TYPE_LABELS[i.type] || i.type}
                    </span>
                    <span className="text-[10px] text-slate-400">{formatDateTime(i.created_at)}</span>
                  </div>
                  <p className="text-slate-700 mt-1">{i.summary}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}