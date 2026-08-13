"use client";

import { useState, useEffect } from "react";
import { Building2, Calendar, MessageCircle, DollarSign, Bed, CheckCircle2, LogIn, LogOut, XCircle, Search, Clock, Plus, Dog, Utensils } from "lucide-react";
import type { Reservation, Organization, Property } from "@/lib/types";

export default function ReservationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal de Pago
  const [paymentRes, setPaymentRes] = useState<Reservation | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentType, setPaymentType] = useState<string>("balance_saldo");
  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer");
  const [transactionRef, setTransactionRef] = useState<string>("");
  const [paymentLoading, setPaymentLoading] = useState<boolean>(false);

  // 1. Cargar Organizaciones
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
        }
      } catch (e) {
        console.error("Error al cargar organizaciones:", e);
      }
    }
    loadMetadata();
  }, []);

  // 2. Al cambiar de Org, actualizar propiedades y persistir selección
  useEffect(() => {
    if (!selectedOrgId || organizations.length === 0) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("crm_selected_org_id", selectedOrgId);
    }
    const currentOrg = organizations.find((o) => o.id === selectedOrgId);
    if (currentOrg) {
      setProperties((currentOrg as any).properties || []);
      setSelectedPropertyId("");
    }
  }, [selectedOrgId, organizations]);

  // 3. Cargar Reservas
  async function fetchReservations() {
    if (!selectedOrgId) return;
    setLoading(true);
    try {
      let url = `/api/reservations?organization_id=${selectedOrgId}`;
      if (selectedPropertyId) url += `&property_id=${selectedPropertyId}`;
      if (statusFilter) url += `&status=${statusFilter}`;

      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setReservations(data);
      }
    } catch (e) {
      console.error("Error al cargar reservas:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReservations();
  }, [selectedOrgId, selectedPropertyId, statusFilter]);

  async function handleStatusChange(reservationId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchReservations();
      }
    } catch (e) {
      console.error("Error al cambiar estado:", e);
    }
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentRes || paymentAmount <= 0) return;

    setPaymentLoading(true);
    try {
      const res = await fetch(`/api/reservations/${paymentRes.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: paymentAmount,
          payment_type: paymentType,
          payment_method: paymentMethod,
          transaction_reference: transactionRef.trim() || null,
        }),
      });
      if (res.ok) {
        setPaymentRes(null);
        setPaymentAmount(0);
        setTransactionRef("");
        fetchReservations();
      }
    } catch (e) {
      console.error("Error al registrar pago:", e);
    } finally {
      setPaymentLoading(false);
    }
  }

  const filteredReservations = reservations.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.guest_name.toLowerCase().includes(q) ||
      r.guest_phone.toLowerCase().includes(q) ||
      r.reservation_code.toLowerCase().includes(q)
    );
  });

  const statusTabs = [
    { key: "", label: "Todas" },
    { key: "pendiente_pago", label: "Pendientes Seña" },
    { key: "senada", label: "Señadas" },
    { key: "confirmada", label: "Confirmadas (100%)" },
    { key: "in_house", label: "In-House (Alojados)" },
    { key: "checkout", label: "Check-out" },
    { key: "cancelada", label: "Canceladas" },
  ];

  function getStatusBadge(status: string) {
    switch (status) {
      case "pendiente_pago":
        return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">Pendiente Seña</span>;
      case "senada":
        return <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">✓ Señada</span>;
      case "confirmada":
        return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">✓ Pagada Total</span>;
      case "in_house":
        return <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-700">★ In-House</span>;
      case "checkout":
        return <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">Check-out</span>;
      case "completada":
        return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">Completada</span>;
      case "cancelada":
        return <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">Cancelada</span>;
      default:
        return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">{status}</span>;
    }
  }

  function getDaysToArrival(checkInDateStr: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkIn = new Date(checkInDateStr);
    checkIn.setHours(0, 0, 0, 0);
    const diff = Math.ceil((checkIn.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "¡Llega Hoy!";
    if (diff === 1) return "Llega Mañana";
    if (diff > 1) return `En ${diff} días`;
    return `Pasó hace ${Math.abs(diff)}d`;
  }

  function getWhatsAppUrl(res: Reservation) {
    const raw = res.guest_phone.replace(/\D/g, "");
    const clean = raw.startsWith("54") ? raw : "549" + raw;
    const msg = `¡Hola ${res.guest_name}! Te contactamos de ${res.property?.name || "nuestro hotel"} por tu reserva ${res.reservation_code} para el ${res.check_in_date}. Saldo pendiente: $${res.balance_pending.toLocaleString("es-AR")}. ¿Tenés alguna duda antes de tu llegada?`;
    return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Reservas & Operaciones de Check-in</h1>
            <p className="text-xs text-slate-500">Control de huéspedes confirmados, asignación de unidades y cobro de saldos</p>
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

      {/* Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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

        <div className="flex items-center gap-2">
          {properties.length > 0 && (
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
            >
              <option value="">Todas las Sedes</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar huésped o código..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-52 rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Lista de Reservas */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-sm font-medium text-slate-400 bg-white rounded-2xl border border-slate-200">
            Cargando reservas...
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <p className="text-sm font-semibold text-slate-700">No hay reservas con los filtros seleccionados.</p>
          </div>
        ) : (
          filteredReservations.map((res) => {
            const daysArrival = getDaysToArrival(res.check_in_date);
            const isArrivalSoon = daysArrival.includes("Hoy") || daysArrival.includes("Mañana");

            return (
              <div
                key={res.id}
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 transition-all"
              >
                {/* Columna Datos Huésped & Código */}
                <div className="space-y-1.5 min-w-[280px]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md">
                      {res.reservation_code}
                    </span>
                    {getStatusBadge(res.status)}
                  </div>

                  <h3 className="font-bold text-slate-900 text-base">{res.guest_name}</h3>

                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">{res.guest_phone}</span>
                    {res.property && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                        <Building2 size={12} /> {res.property.name}
                      </span>
                    )}
                  </div>

                  {/* Unidades asignadas */}
                  {res.items && res.items.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {res.items.map((item) => (
                        <span key={item.id} className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                          <Bed size={12} /> {item.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Dietas y Especiales */}
                  {(res.dietary_notes || res.special_requests || res.pets_count > 0) && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
                      {res.pets_count > 0 && (
                        <span className="text-amber-700 font-semibold flex items-center gap-1">
                          <Dog size={12} /> {res.pets_count} mascota(s)
                        </span>
                      )}
                      {(res.dietary_notes || res.special_requests) && (
                        <span className="italic truncate max-w-xs">
                          <Utensils size={11} className="inline mr-1 text-slate-400" />
                          {res.dietary_notes || res.special_requests}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Columna Fechas & Cuenta Regresiva */}
                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 min-w-[210px] space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Estancia:</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${isArrivalSoon ? 'bg-amber-100 text-amber-800 animate-pulse font-extrabold' : 'bg-slate-200 text-slate-700'}`}>
                      {daysArrival}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 font-medium">
                    <span className="text-slate-500">In:</span> {res.check_in_date}
                  </p>
                  <p className="text-xs text-slate-800 font-medium">
                    <span className="text-slate-500">Out:</span> {res.check_out_date}
                  </p>
                </div>

                {/* Columna Financiera (Total, Pagado, Saldo) */}
                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 min-w-[210px] space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Total Reserva:</span>
                    <span className="font-bold text-slate-900">${res.total_price.toLocaleString("es-AR")}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-600 font-medium">Total Pagado:</span>
                    <span className="font-bold text-emerald-700">${res.total_paid.toLocaleString("es-AR")}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 font-bold">
                    <span className="text-slate-700">Saldo Pendiente:</span>
                    <span className={`text-sm ${res.balance_pending > 0 ? 'text-rose-600 font-extrabold' : 'text-emerald-600'}`}>
                      ${res.balance_pending.toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>

                {/* Columna Acciones Operativas */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* WhatsApp */}
                  <a
                    href={getWhatsAppUrl(res)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                  >
                    <MessageCircle size={14} /> WhatsApp
                  </a>

                  {/* Registrar Pago / Saldo */}
                  <button
                    onClick={() => {
                      setPaymentRes(res);
                      setPaymentAmount(res.balance_pending > 0 ? res.balance_pending : 0);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800"
                  >
                    <DollarSign size={14} /> Cobrar
                  </button>

                  {/* Check-in */}
                  {res.status !== "in_house" && res.status !== "checkout" && res.status !== "cancelada" && (
                    <button
                      onClick={() => handleStatusChange(res.id, "in_house")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-purple-700"
                      title="Registrar Check-in del Huésped"
                    >
                      <LogIn size={14} /> Check-in
                    </button>
                  )}

                  {/* Check-out */}
                  {res.status === "in_house" && (
                    <button
                      onClick={() => handleStatusChange(res.id, "checkout")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                      title="Registrar Check-out y Salida"
                    >
                      <LogOut size={14} /> Check-out
                    </button>
                  )}

                  {/* Cancelar */}
                  {res.status !== "cancelada" && res.status !== "checkout" && (
                    <button
                      onClick={() => {
                        if (confirm(`¿Estás seguro de cancelar la reserva ${res.reservation_code}? Se liberará la unidad inmediatamente.`)) {
                          handleStatusChange(res.id, "cancelada");
                        }
                      }}
                      className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                      title="Cancelar Reserva"
                    >
                      <XCircle size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal para Registrar Pago */}
      {paymentRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Registrar Pago / Cobro</h2>
              <button onClick={() => setPaymentRes(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <XCircle size={18} />
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-600">
              Reserva <span className="font-bold text-slate-900">{paymentRes.reservation_code}</span> ({paymentRes.guest_name}). Saldo pendiente: <span className="font-bold text-rose-600">${paymentRes.balance_pending.toLocaleString("es-AR")}</span>
            </p>

            <form onSubmit={handleAddPayment} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Monto a Cobrar ($) *</label>
                <input
                  type="number"
                  min="1"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  required
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Pago</label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white"
                  >
                    <option value="balance_saldo">Saldo Restante</option>
                    <option value="deposit_sena">Seña / Anticipo</option>
                    <option value="extra_service">Consumo Extra / Servicio</option>
                    <option value="refund_reembolso">Reembolso</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Medio de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white"
                  >
                    <option value="bank_transfer">Transferencia</option>
                    <option value="cash">Efectivo</option>
                    <option value="credit_card">Tarjeta</option>
                    <option value="mercadopago">MercadoPago</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nº Comprobante / Referencia</label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="Ej: Transf. 984521"
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentRes(null)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={paymentLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
                >
                  <DollarSign size={16} />
                  {paymentLoading ? "Guardando..." : "Registrar Cobro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
