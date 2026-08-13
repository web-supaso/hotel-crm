"use client";

import { useState, useEffect } from "react";
import { Building2, Users, CheckCircle2, DollarSign, XCircle, TrendingUp, Sparkles, Bed, ShieldAlert } from "lucide-react";
import type { Organization, Lead, Reservation, DiscardReason } from "@/lib/types";

export default function DashboardMetricsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");

  const [leads, setLeads] = useState<Lead[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [discardReasons, setDiscardReasons] = useState<DiscardReason[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 1. Cargar Organizaciones
  useEffect(() => {
    async function loadMetadata() {
      try {
        const res = await fetch("/api/organizations");
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setOrganizations(data);
          setSelectedOrgId(data[0].id);
        }
      } catch (e) {
        console.error("Error al cargar organizaciones:", e);
      }
    }
    loadMetadata();
  }, []);

  // 2. Cargar Datos del Dashboard para la Org seleccionada
  useEffect(() => {
    if (!selectedOrgId) return;
    async function loadDashboardData() {
      setLoading(true);
      try {
        const [leadsRes, resRes, reasonsRes] = await Promise.all([
          fetch(`/api/leads?organization_id=${selectedOrgId}`),
          fetch(`/api/reservations?organization_id=${selectedOrgId}`),
          fetch(`/api/discard-reasons?organization_id=${selectedOrgId}`),
        ]);

        const [leadsData, reservationsData, reasonsData] = await Promise.all([
          leadsRes.json(),
          resRes.json(),
          reasonsRes.json(),
        ]);

        setLeads(Array.isArray(leadsData) ? leadsData : []);
        setReservations(Array.isArray(reservationsData) ? reservationsData : []);
        setDiscardReasons(Array.isArray(reasonsData) ? reasonsData : []);
      } catch (e) {
        console.error("Error al cargar dashboard:", e);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [selectedOrgId]);

  // Cálculos de KPIs
  const totalLeads = leads.length;
  const activeLeads = leads.filter((l) => ["nuevo", "contactado", "propuesta_enviada", "negociacion"].includes(l.status)).length;
  const convertedLeads = leads.filter((l) => l.status === "convertido").length;
  const discardedLeads = leads.filter((l) => l.status === "descartado").length;
  const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  const totalRevenue = reservations.reduce((acc, r) => acc + (r.status !== "cancelada" ? Number(r.total_price) : 0), 0);
  const totalCollected = reservations.reduce((acc, r) => acc + (r.status !== "cancelada" ? Number(r.total_paid) : 0), 0);
  const totalPendingBalance = reservations.reduce((acc, r) => acc + (r.status !== "cancelada" ? Number(r.balance_pending) : 0), 0);

  // Conteo de descartes por motivo
  const discardCounts = discardReasons.map((reason) => {
    const count = leads.filter((l) => l.status === "descartado" && l.discard_reason_id === reason.id).length;
    return { label: reason.label, count };
  }).filter((r) => r.count > 0).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <TrendingUp size={20} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Dashboard & Analítica Comercial</h1>
            <p className="text-xs text-slate-500">Métricas de conversión, facturación hotelera y motivos de descarte</p>
          </div>
        </div>

        {/* Tenant Selector */}
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          <span className="text-xs font-bold text-slate-500 uppercase px-2">Org:</span>
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-slate-900 border border-slate-300"
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total Pipeline */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Leads Activos</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">{activeLeads}</p>
              <p className="mt-1 text-xs text-slate-500">{totalLeads} solicitudes totales</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
              <Users size={20} />
            </div>
          </div>
        </div>

        {/* Tasa de Conversión */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Conversión a Reserva</p>
              <p className="mt-2 text-3xl font-extrabold text-emerald-600">{conversionRate}%</p>
              <p className="mt-1 text-xs text-emerald-700 font-medium">{convertedLeads} convertidos con seña</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>

        {/* Facturación Total */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Volumen Reservas</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">${totalRevenue.toLocaleString("es-AR")}</p>
              <p className="mt-1 text-xs text-slate-500">{reservations.length} reservas registradas</p>
            </div>
            <div className="rounded-xl bg-purple-50 p-2.5 text-purple-600">
              <DollarSign size={20} />
            </div>
          </div>
        </div>

        {/* Cobranza vs Saldos */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Cobrado (Señas)</p>
              <p className="mt-2 text-2xl font-extrabold text-emerald-700">${totalCollected.toLocaleString("es-AR")}</p>
              <p className="mt-1 text-xs text-rose-600 font-bold">Pendiente: ${totalPendingBalance.toLocaleString("es-AR")}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
              <TrendingUp size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Analítica de Descartes & Distribución */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Motivos de Descarte (14 Razones Estandarizadas) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert size={18} className="text-rose-600" />
            <h2 className="text-base font-bold text-slate-900">Motivos de Pérdida de Leads ({discardedLeads} descartes)</h2>
          </div>

          {discardCounts.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              Aún no hay suficientes leads descartados para mostrar estadísticas de pérdida.
            </p>
          ) : (
            <div className="space-y-3">
              {discardCounts.map((item, idx) => {
                const percent = Math.round((item.count / (discardedLeads || 1)) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-700">{item.label}</span>
                      <span className="text-slate-900 font-bold">{item.count} ({percent}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Resumen Operativo de Reservas */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Bed size={18} className="text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Estado Operativo del Hospedaje</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-center">
              <p className="text-xs text-slate-500 font-medium">Huéspedes In-House</p>
              <p className="text-2xl font-black text-purple-700 mt-1">
                {reservations.filter((r) => r.status === "in_house").length}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-center">
              <p className="text-xs text-slate-500 font-medium">Próximos Check-ins</p>
              <p className="text-2xl font-black text-indigo-700 mt-1">
                {reservations.filter((r) => r.status === "senada" || r.status === "confirmada").length}
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-indigo-50/60 p-4 border border-indigo-100 flex items-start gap-3">
            <Sparkles size={18} className="text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-indigo-900">Inteligencia Automática Activa</p>
              <p className="text-[11px] text-indigo-700 leading-relaxed mt-0.5">
                Las solicitudes entrantes desde el webhook web se analizan automáticamente con Gemini para extraer fechas, calcular la urgencia y redactar respuestas personalizadas para WhatsApp.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}