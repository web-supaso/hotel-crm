"use client";

import { useState, useEffect } from "react";
import { MessageCircle, CreditCard, XCircle, Sparkles, Filter, Calendar, Users, Building2, Search, ArrowRight, Dog, Utensils, Heart, MessageSquare, RotateCw } from "lucide-react";
import type { Lead, Organization, Property, Experience } from "@/lib/types";
import { buildWhatsAppLink, formatWhatsAppNumber } from "@/lib/phone";
import { DiscardModal } from "./components/discard-modal";
import { ConvertDrawer } from "./components/convert-drawer";
import { NewLeadModal } from "./components/new-lead-modal";

export default function LeadsPipelinePage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Estados de Modales
  const [discardLead, setDiscardLead] = useState<{ id: string; name: string } | null>(null);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);

  // 1. Cargar Organizaciones y Metadatos al inicio
  useEffect(() => {
    async function loadMetadata() {
      try {
        const res = await fetch("/api/organizations");
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setOrganizations(data);
          const savedOrgId = typeof window !== "undefined" ? localStorage.getItem("crm_selected_org_id") : null;
          const current = (savedOrgId && data.find((o: any) => o.id === savedOrgId)) || data[0];
          setSelectedOrgId(current.id);
          setProperties(current.properties || []);
          setExperiences(current.experiences || []);
        }
      } catch (e) {
        console.error("Error al cargar organizaciones:", e);
      }
    }
    loadMetadata();
  }, []);

  // 2. Al cambiar de Organización, actualizar propiedades y experiencias
  useEffect(() => {
    if (!selectedOrgId || organizations.length === 0) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("crm_selected_org_id", selectedOrgId);
    }
    const currentOrg = organizations.find((o) => o.id === selectedOrgId);
    if (currentOrg) {
      setProperties((currentOrg as any).properties || []);
      setExperiences((currentOrg as any).experiences || []);
      setSelectedPropertyId("");
    }
  }, [selectedOrgId, organizations]);

  // 3. Cargar Leads según filtros
  async function fetchLeads(silent = false) {
    if (!selectedOrgId) return;
    if (!silent) setLoading(true);
    setIsRefreshing(true);
    try {
      let url = `/api/leads?organization_id=${selectedOrgId}`;
      if (selectedPropertyId) url += `&property_id=${selectedPropertyId}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setLeads(data);
      }
    } catch (e) {
      console.error("Error al cargar leads:", e);
    } finally {
      if (!silent) setLoading(false);
      setIsRefreshing(false);
    }
  }

  // Carga inicial y por cambio de filtros
  useEffect(() => {
    fetchLeads();
  }, [selectedOrgId, selectedPropertyId, statusFilter]);

  // Auto-refresco en segundo plano cada 10 segundos para ver solicitudes web en vivo
  useEffect(() => {
    if (!selectedOrgId) return;
    const interval = setInterval(() => {
      fetchLeads(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedOrgId, selectedPropertyId, statusFilter]);

  // Filtrado de búsqueda local por nombre o teléfono
  const filteredLeads = leads.filter((l) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.guest_name.toLowerCase().includes(q) ||
      l.guest_phone.toLowerCase().includes(q) ||
      (l.property?.name || "").toLowerCase().includes(q)
    );
  });

  const statusTabs = [
    { key: "", label: "Todos" },
    { key: "nuevo", label: "Nuevos" },
    { key: "contactado", label: "Contactados" },
    { key: "propuesta_enviada", label: "Propuesta Enviada" },
    { key: "negociacion", label: "En Negociación" },
    { key: "convertido", label: "Convertidos (Reserva)" },
    { key: "descartado", label: "Descartados" },
  ];

  function getStatusBadge(status: string) {
    switch (status) {
      case "nuevo":
        return <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">Nuevo Lead</span>;
      case "contactado":
        return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">Contactado</span>;
      case "propuesta_enviada":
        return <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-700">Propuesta Enviada</span>;
      case "negociacion":
        return <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">En Negociación</span>;
      case "convertido":
        return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">✓ Convertido</span>;
      case "descartado":
        return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">Descartado</span>;
      default:
        return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">{status}</span>;
    }
  }

  function calculateNights(inDate: string | null, outDate: string | null): number {
    if (!inDate || !outDate) return 0;
    const diff = new Date(outDate + "T00:00:00").getTime() - new Date(inDate + "T00:00:00").getTime();
    return diff > 0 ? Math.round(diff / (1000 * 60 * 60 * 24)) : 0;
  }

  function getWhatsAppUrl(lead: Lead) {
    const nights = calculateNights(lead.requested_check_in, lead.requested_check_out);
    return buildWhatsAppLink(
      lead.guest_phone,
      lead.guest_name,
      lead.property?.name,
      lead.requested_check_in,
      lead.requested_check_out,
      nights,
      lead.ai_suggested_reply
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Multi-Tenant Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Building2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900">Pipeline de Leads & Reservas</h1>
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> En vivo
                </span>
              </div>
              <p className="text-xs text-slate-500">Gestión comercial y sincronización en tiempo real</p>
            </div>
          </div>
        </div>

        {/* Botón Actualizar, Tenant Selector & New Lead Button */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Botón Actualizar Manual */}
          <button
            onClick={() => fetchLeads(false)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
            title="Actualizar listado ahora"
          >
            <RotateCw size={14} className={isRefreshing ? "animate-spin text-indigo-600" : "text-slate-500"} />
            Actualizar
          </button>

          {/* Selector de Organización */}
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-500 uppercase px-2">Organización:</span>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-slate-900 border border-slate-300 focus:ring-2 focus:ring-indigo-200"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <NewLeadModal
            organizationId={selectedOrgId}
            properties={properties}
            onSuccess={() => fetchLeads(false)}
          />
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tabs de Estado */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                statusFilter === tab.key
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filtro de Propiedad y Buscador */}
        <div className="flex items-center gap-2">
          {properties.length > 0 && (
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
            >
              <option value="">Todas las Sedes / Refugios</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o tel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Lista / Grid de Leads */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-sm font-medium text-slate-400 bg-white rounded-2xl border border-slate-200">
            Cargando solicitudes...
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <p className="text-sm font-semibold text-slate-700">No hay leads con los filtros seleccionados.</p>
            <p className="text-xs text-slate-400 mt-1">Crea un nuevo lead con el botón superior o cambia los filtros.</p>
          </div>
        ) : (
          filteredLeads.map((lead) => {
            // Extraer detalles de ocasiones y mensajes del texto
            const requests = lead.special_requests || "";
            const isOccasion = requests.includes("Ocasión:") ? requests.split("Ocasión:")[1].split("|")[0].trim() : null;
            const isMsg = requests.includes("Mensaje:") ? requests.split("Mensaje:")[1].trim() : null;
            const hasBreakdown = requests.includes("Desglose:") ? requests.split("Desglose:")[1].split("|")[0].trim() : null;
            const nights = calculateNights(lead.requested_check_in, lead.requested_check_out);

            return (
              <div
                key={lead.id}
                className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
              >
                {/* Columna Principal: Datos del Huésped */}
                <div className="space-y-2 min-w-[300px] flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-900 text-base">{lead.guest_name}</h3>
                    {getStatusBadge(lead.status)}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-600">
                    <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg">{lead.guest_phone}</span>
                    {lead.guest_email && <span className="text-slate-500">{lead.guest_email}</span>}
                    {lead.property && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-0.5 font-bold text-indigo-700">
                        <Building2 size={12} /> {lead.property.name}
                      </span>
                    )}
                  </div>

                  {/* Fechas con Cantidad de Noches Calculadas & Desglose */}
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60 text-amber-900">
                      <Calendar size={13} className="text-amber-700" />
                      {lead.requested_check_in ? (
                        <>
                          {lead.requested_check_in} al {lead.requested_check_out || '?'}
                          {nights > 0 && (
                            <span className="font-black text-amber-700 text-[11px]">
                              ({nights} {nights === 1 ? "noche" : "noches"})
                            </span>
                          )}
                        </>
                      ) : (
                        "Fechas a definir"
                      )}
                    </span>

                    <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg text-slate-800">
                      <Users size={13} className="text-slate-500" />
                      {hasBreakdown || `${lead.guests_count} personas`}
                    </span>

                    {lead.pets_count > 0 && (
                      <span className="flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <Dog size={13} /> {lead.pets_count} mascota(s)
                      </span>
                    )}

                    {lead.dietary_notes && (
                      <span className="flex items-center gap-1 bg-purple-50 text-purple-800 px-2.5 py-1 rounded-lg border border-purple-200">
                        <Utensils size={13} /> {lead.dietary_notes}
                      </span>
                    )}
                  </div>

                  {/* Ocasión Especial y Mensaje del Cliente */}
                  {(isOccasion || isMsg || (!hasBreakdown && requests)) && (
                    <div className="space-y-1 pt-1">
                      {isOccasion && (
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-pink-50 px-2.5 py-1 text-xs font-bold text-pink-800 border border-pink-200/60 mr-2">
                          <Heart size={12} className="text-pink-600" /> Ocasión: {isOccasion}
                        </div>
                      )}
                      {isMsg && (
                        <div className="flex items-start gap-1.5 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200 mt-1">
                          <MessageSquare size={13} className="text-slate-400 mt-0.5 shrink-0" />
                          <p className="italic font-medium">"{isMsg}"</p>
                        </div>
                      )}
                      {!isOccasion && !isMsg && requests && !requests.startsWith("Desglose:") && (
                        <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-200">
                          {requests}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Columna Inteligencia IA (Gemini) */}
                <div className="flex-1 rounded-2xl bg-slate-50/80 p-3.5 border border-slate-200/70 max-w-md">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
                    <span className="flex items-center gap-1 text-indigo-700">
                      <Sparkles size={13} /> Diagnóstico IA: {lead.ai_urgency ? `Urgencia ${lead.ai_urgency.toUpperCase()}` : "Normal"}
                    </span>
                    {lead.ai_intent_score && (
                      <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-[10px] font-black">
                        Score: {lead.ai_intent_score}/100
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {lead.ai_summary || "Diagnóstico generado automáticamente al ingresar consulta."}
                  </p>
                </div>

                {/* Columna Acciones Rápidas */}
                <div className="flex items-center gap-2 shrink-0 self-center lg:self-start pt-1">
                  {/* Botón WhatsApp Directo */}
                  {formatWhatsAppNumber(lead.guest_phone) ? (
                    <a
                      href={getWhatsAppUrl(lead)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Abrir WhatsApp con ${lead.guest_name} (${lead.guest_phone})`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
                    >
                      <MessageCircle size={15} className="shrink-0" />
                      <span>WhatsApp</span>
                    </a>
                  ) : (
                    <span
                      title="Sin número de WhatsApp registrado"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2.5 text-xs font-bold text-slate-400 cursor-not-allowed border border-slate-200"
                    >
                      <MessageCircle size={15} className="shrink-0" />
                      <span>WhatsApp</span>
                    </span>
                  )}

                  {/* Botón Convertir a Reserva */}
                  {lead.status !== "convertido" && lead.status !== "descartado" && (
                    <button
                      onClick={() => setConvertLead(lead)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors"
                    >
                      <CreditCard size={15} /> Convertir
                    </button>
                  )}

                  {/* Botón Descartar */}
                  {lead.status !== "descartado" && lead.status !== "convertido" && (
                    <button
                      onClick={() => setDiscardLead({ id: lead.id, name: lead.guest_name })}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
                      title="Descartar solicitud"
                    >
                      <XCircle size={16} />
                    </button>
                  )}

                  {lead.status === "descartado" && lead.discard_reason && (
                    <span className="text-[11px] text-rose-700 font-semibold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                      Motivo: {lead.discard_reason.label}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Descarte */}
      {discardLead && (
        <DiscardModal
          isOpen={true}
          leadId={discardLead.id}
          guestName={discardLead.name}
          organizationId={selectedOrgId}
          onClose={() => setDiscardLead(null)}
          onSuccess={() => fetchLeads(false)}
        />
      )}

      {/* Drawer de Conversión a Reserva */}
      {convertLead && (
        <ConvertDrawer
          isOpen={true}
          lead={convertLead}
          properties={properties}
          experiences={experiences}
          onClose={() => setConvertLead(null)}
          onSuccess={() => fetchLeads(false)}
        />
      )}
    </div>
  );
}