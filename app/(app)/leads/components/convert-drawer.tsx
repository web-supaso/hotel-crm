"use client";

import { useState, useEffect } from "react";
import { X, Calendar, DollarSign, Bed, Sparkles, Check, AlertCircle, Building2, User, Phone, Mail } from "lucide-react";
import type { Lead, Property, Unit, Experience } from "@/lib/types";

interface ConvertDrawerProps {
  isOpen: boolean;
  lead: Lead | null;
  properties: Property[];
  experiences: Experience[];
  onClose: () => void;
  onSuccess: () => void;
}

function getNextDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function getTodayStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ConvertDrawer({
  isOpen,
  lead,
  properties,
  experiences,
  onClose,
  onSuccess,
}: ConvertDrawerProps) {
  const todayStr = getTodayStr();

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [selectedExperiences, setSelectedExperiences] = useState<
    { id: string; name: string; unit_price: number; quantity: number }[]
  >([]);

  const [checkInDate, setCheckInDate] = useState<string>("");
  const [checkOutDate, setCheckOutDate] = useState<string>("");

  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer");
  const [transactionRef, setTransactionRef] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Inicializar estado con datos del Lead
  useEffect(() => {
    if (lead) {
      setSelectedPropertyId(lead.property_id || properties[0]?.id || "");
      
      const inDate = lead.requested_check_in || todayStr;
      const outDate = lead.requested_check_out && lead.requested_check_out > inDate 
        ? lead.requested_check_out 
        : getNextDay(inDate);

      setCheckInDate(inDate);
      setCheckOutDate(outDate);
      setSelectedUnitIds([]);
      setSelectedExperiences([]);
      setDepositAmount(0);
      setError(null);
    }
  }, [lead, properties, todayStr]);

  if (!isOpen || !lead) return null;

  const currentProperty = properties.find((p) => p.id === selectedPropertyId);
  const availableUnits = currentProperty?.units || [];

  // Calcular número de noches
  const nights = checkInDate && checkOutDate && new Date(checkOutDate) > new Date(checkInDate)
    ? Math.max(1, Math.round((new Date(checkOutDate + "T00:00:00").getTime() - new Date(checkInDate + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24)))
    : 1;

  // Recalcular precio total
  useEffect(() => {
    let sum = 0;
    // Suma de unidades por noche
    for (const unitId of selectedUnitIds) {
      const u = availableUnits.find((unit) => unit.id === unitId);
      if (u) sum += Number(u.base_price_default) * nights;
    }
    // Suma de experiencias
    for (const exp of selectedExperiences) {
      sum += Number(exp.unit_price) * (exp.quantity || 1);
    }

    setTotalPrice(sum);
    // Sugerir 30% de seña por defecto
    if (depositAmount === 0 || depositAmount > sum) {
      setDepositAmount(Math.round(sum * 0.3));
    }
  }, [selectedUnitIds, selectedExperiences, nights, availableUnits]);

  function handleCheckInChange(newIn: string) {
    setCheckInDate(newIn);
    if (newIn) {
      const minOut = getNextDay(newIn);
      if (!checkOutDate || checkOutDate <= newIn) {
        setCheckOutDate(minOut);
      }
    }
  }

  function toggleUnit(unitId: string) {
    setSelectedUnitIds((prev) =>
      prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]
    );
  }

  function toggleExperience(exp: Experience) {
    setSelectedExperiences((prev) => {
      const exists = prev.find((e) => e.id === exp.id);
      if (exists) return prev.filter((e) => e.id !== exp.id);
      return [...prev, { id: exp.id, name: exp.name, unit_price: exp.base_price, quantity: lead?.guests_count || 1 }];
    });
  }

  async function handleConvert(e: React.FormEvent) {
    e.preventDefault();
    if (!lead) return;
    if (!selectedPropertyId) {
      setError("Debes seleccionar una propiedad.");
      return;
    }
    if (selectedUnitIds.length === 0) {
      setError("Debes asignar al menos una unidad de alojamiento (habitación, carpa o cabaña).");
      return;
    }
    if (!checkInDate || !checkOutDate) {
      setError("Las fechas de check-in y check-out son obligatorias.");
      return;
    }
    if (new Date(checkOutDate) <= new Date(checkInDate)) {
      setError("La fecha de check-out debe ser posterior a la fecha de check-in.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/leads/${lead.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: selectedPropertyId,
          unit_ids: selectedUnitIds,
          experiences: selectedExperiences,
          check_in_date: checkInDate,
          check_out_date: checkOutDate,
          total_price: totalPrice,
          deposit_required: Math.round(totalPrice * 0.3), // 30% sugerido
          deposit_amount: depositAmount,
          payment_method: paymentMethod,
          transaction_reference: transactionRef.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al convertir lead a reserva.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const minCheckOutDate = checkInDate ? getNextDay(checkInDate) : getNextDay(todayStr);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 bg-slate-50">
          <div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              Conversión Comercial
            </span>
            <h2 className="mt-1 text-lg font-extrabold text-slate-900">Crear Reserva & Registrar Seña</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Lead Snapshot Banner */}
        <div className="bg-indigo-50/70 border-b border-indigo-100/60 p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
              Datos del Huésped (Lead)
            </span>
            <span className="text-xs text-indigo-700 font-semibold">{lead.guest_phone}</span>
          </div>
          <p className="text-base font-bold text-slate-900">{lead.guest_name}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span>👥 {lead.guests_count} personas</span>
            {lead.pets_count > 0 && <span>🐾 {lead.pets_count} mascota(s)</span>}
            {lead.dietary_notes && <span className="text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md font-medium">🥗 {lead.dietary_notes}</span>}
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-xs font-semibold text-rose-700 border border-rose-200">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleConvert} className="flex-1 p-6 space-y-6">
          {/* Sede / Propiedad */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Propiedad de Destino
            </label>
            <select
              value={selectedPropertyId}
              onChange={(e) => {
                setSelectedPropertyId(e.target.value);
                setSelectedUnitIds([]);
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.city || "Sede"})</option>
              ))}
            </select>
          </div>

          {/* Fechas Síncronas con Bloqueo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Fecha Check-in
              </label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="date"
                  min={todayStr}
                  value={checkInDate}
                  onChange={(e) => handleCheckInChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 pl-9 pr-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Fecha Check-out
              </label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="date"
                  min={minCheckOutDate}
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 pl-9 pr-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  required
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-indigo-600 font-medium -mt-2">
            Duración: {nights} {nights === 1 ? "noche" : "noches"}
          </p>

          {/* Asignación de Unidades */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Unidades a Asignar en {currentProperty?.name}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              {availableUnits.map((u) => {
                const isSelected = selectedUnitIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleUnit(u.id)}
                    className={`flex items-start justify-between rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 font-semibold ring-2 ring-indigo-200"
                        : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <Bed size={14} className={isSelected ? "text-indigo-600" : "text-slate-400"} />
                        <span className="font-bold">{u.name}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Cap: {u.capacity_people} pers. • ${Number(u.base_price_default).toLocaleString("es-AR")}/noche
                      </p>
                    </div>
                    {isSelected && <Check size={16} className="text-indigo-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Experiencias Adicionales */}
          {experiences.length > 0 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Experiencias / Paquetes Extra
              </label>
              <div className="space-y-1.5 mt-1">
                {experiences.map((exp) => {
                  const isSelected = selectedExperiences.some((e) => e.id === exp.id);
                  return (
                    <button
                      key={exp.id}
                      type="button"
                      onClick={() => toggleExperience(exp)}
                      className={`flex w-full items-center justify-between rounded-xl border p-3 text-xs transition-all ${
                        isSelected
                          ? "border-purple-600 bg-purple-50 text-purple-950 font-semibold ring-2 ring-purple-200"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className={isSelected ? "text-purple-600" : "text-slate-400"} />
                        <span>{exp.name}</span>
                      </div>
                      <span className="font-bold text-slate-900">
                        +${Number(exp.base_price).toLocaleString("es-AR")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Resumen Financiero & Cobro de Seña */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Liquidación Financiera
            </h3>

            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">Tarifa Total de la Reserva:</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-500 font-bold">$</span>
                <input
                  type="number"
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(Number(e.target.value))}
                  className="w-32 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-right text-sm font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">Monto de Seña / Anticipo:</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-500 font-bold">$</span>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="w-32 rounded-lg border border-emerald-300 bg-emerald-50/50 px-2.5 py-1 text-right text-sm font-bold text-emerald-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-xs">
              <span className="font-bold text-slate-500">Saldo Pendiente al Check-in:</span>
              <span className="font-extrabold text-rose-600 text-sm">
                ${Math.max(0, totalPrice - depositAmount).toLocaleString("es-AR")}
              </span>
            </div>

            {/* Medio de Pago & Referencia */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Medio de Pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-semibold text-slate-800"
                >
                  <option value="bank_transfer">Transferencia Bancaria</option>
                  <option value="mercadopago">Mercado Pago</option>
                  <option value="credit_card">Tarjeta de Crédito</option>
                  <option value="cash">Efectivo</option>
                  <option value="other">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Nº Comprobante / Ref</label>
                <input
                  type="text"
                  placeholder="Ej: Transf #8492"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-all"
            >
              <Check size={16} />
              {loading ? "Generando Reserva..." : "Confirmar Reserva & Bloquear Cupo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
