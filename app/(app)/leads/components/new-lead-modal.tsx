"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, X, Calendar, User, Phone, Mail, Users, Dog, Utensils, Heart, MessageSquare, Check, Sparkles } from "lucide-react";
import type { Property } from "@/lib/types";

interface NewLeadModalProps {
  organizationId: string;
  properties: Property[];
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

export function NewLeadModal({ organizationId, properties, onSuccess }: NewLeadModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayStr = getTodayStr();

  // Campos de Contacto
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [propertyId, setPropertyId] = useState(properties[0]?.id || "");

  // Fechas
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

  // Huéspedes
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [babies, setBabies] = useState(0);

  // Extras
  const [specialOccasion, setSpecialOccasion] = useState("");
  const [hasPet, setHasPet] = useState(false);
  const [isVegetarian, setIsVegetarian] = useState(false);
  const [additionalMessage, setAdditionalMessage] = useState("");

  // Manejo de tecla ESC para cerrar
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  function handleCheckInChange(newCheckIn: string) {
    setCheckIn(newCheckIn);
    if (newCheckIn) {
      const minOut = getNextDay(newCheckIn);
      if (!checkOut || checkOut <= newCheckIn) {
        setCheckOut(minOut);
      }
    }
  }

  const totalNights = checkIn && checkOut && new Date(checkOut) > new Date(checkIn)
    ? Math.round((new Date(checkOut + "T00:00:00").getTime() - new Date(checkIn + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const totalGuests = adults + children + babies;
  const minCheckOutDate = checkIn ? getNextDay(checkIn) : getNextDay(todayStr);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    
    if (!fullName || !phone.trim()) {
      setError("El nombre y el teléfono de WhatsApp son obligatorios.");
      return;
    }

    if (!checkIn || !checkOut) {
      setError("Debes seleccionar fecha de Check-in y Check-out.");
      return;
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
      setError("La fecha de Check-out debe ser posterior al Check-in.");
      return;
    }

    setLoading(true);
    setError(null);

    let dietaryNotes = "";
    if (isVegetarian) dietaryNotes = "Opción Vegetariana";

    const guestsBreakdown = `${adults} Adulto${adults > 1 ? "s" : ""}${children > 0 ? ` · ${children} Niño${children > 1 ? "s" : ""}` : ""}${babies > 0 ? ` · ${babies} Bebé${babies > 1 ? "s" : ""}` : ""}`;

    const parts: string[] = [];
    parts.push(`Desglose: ${guestsBreakdown}`);
    if (specialOccasion.trim()) parts.push(`Ocasión: ${specialOccasion.trim()}`);
    if (additionalMessage.trim()) parts.push(`Mensaje: ${additionalMessage.trim()}`);
    const specialRequests = parts.join(" | ");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: organizationId,
          property_id: propertyId || null,
          guest_name: fullName,
          guest_phone: phone.trim(),
          guest_email: email.trim() || null,
          requested_check_in: checkIn,
          requested_check_out: checkOut,
          guests_count: totalGuests,
          adults_count: adults,
          children_count: children,
          babies_count: babies,
          pets_count: hasPet ? 1 : 0,
          experience_level: specialOccasion.trim() || null,
          dietary_notes: dietaryNotes || null,
          special_requests: specialRequests || null,
          source: "manual",
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Error al crear lead");
      }

      setIsOpen(false);
      // Reset
      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
      setCheckIn("");
      setCheckOut("");
      setAdults(2);
      setChildren(0);
      setBabies(0);
      setSpecialOccasion("");
      setHasPet(false);
      setIsVegetarian(false);
      setAdditionalMessage("");
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors"
      >
        <Plus size={16} /> Nuevo Lead
      </button>

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-150"
        >
          {/* Contenedor Modal Horizontal de 2 Columnas */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 text-slate-100 shadow-2xl border border-slate-800 overflow-hidden"
          >
            {/* Header Limpio */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black text-sm">
                  +
                </div>
                <div>
                  <h2 className="text-base font-black text-white">Nuevo Lead / Solicitud Manual</h2>
                  <p className="text-[11px] text-slate-400">Ingreso comercial rápido para seguimiento por WhatsApp</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                title="Cerrar (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="mx-6 mt-3 rounded-xl bg-rose-950/80 border border-rose-800 p-2.5 text-xs text-rose-300 font-semibold shrink-0">
                ⚠️ {error}
              </div>
            )}

            {/* Formulario en 2 Columnas con Scroll Interno Seguro */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* COLUMNA 1: Datos del Huésped y Sede */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
                    <User size={13} /> Datos del Huésped
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Nombre *</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Ej. Sofía"
                        required
                        className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Apellido *</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Ej. Martínez"
                        required
                        className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">WhatsApp / Tel *</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+54 9 351 123456"
                        required
                        className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Correo Electrónico</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="sofia@ejemplo.com"
                        className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Destino / Refugio</label>
                    <select
                      value={propertyId}
                      onChange={(e) => setPropertyId(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-2 text-xs text-white font-semibold focus:border-amber-400 focus:outline-none"
                    >
                      <option value="">A convenir / Cualquier Sede</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.city || "Sede"})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Mensaje / Notas Adicionales</label>
                    <textarea
                      rows={3}
                      value={additionalMessage}
                      onChange={(e) => setAdditionalMessage(e.target.value)}
                      placeholder="Consultas especiales, pedidos particulares..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/90 p-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none resize-none"
                    />
                  </div>
                </div>

                {/* COLUMNA 2: Fechas, Huéspedes y Preferencias */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
                    <Calendar size={13} /> Fechas & Acompañantes
                  </h3>

                  {/* Selector de Fechas */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Check-in *</label>
                      <input
                        type="date"
                        min={todayStr}
                        value={checkIn}
                        onChange={(e) => handleCheckInChange(e.target.value)}
                        required
                        style={{ colorScheme: "dark" }}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-2 text-xs font-semibold text-white focus:border-amber-400 focus:outline-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Check-out *</label>
                      <input
                        type="date"
                        min={minCheckOutDate}
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        required
                        style={{ colorScheme: "dark" }}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-2 text-xs font-semibold text-white focus:border-amber-400 focus:outline-none cursor-pointer"
                      />
                    </div>
                  </div>

                  {totalNights > 0 && (
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-center text-xs font-bold text-amber-400">
                      Estadía calculada: {totalNights} {totalNights === 1 ? "noche" : "noches"}
                    </div>
                  )}

                  {/* Steppers de Huéspedes */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-800/40 p-3 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">Adultos (13+ años)</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAdults(Math.max(1, adults - 1))}
                          className="h-6 w-6 rounded-lg bg-slate-700 text-white font-bold hover:bg-slate-600 flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="w-4 text-center font-black text-xs">{adults}</span>
                        <button
                          type="button"
                          onClick={() => setAdults(adults + 1)}
                          className="h-6 w-6 rounded-lg bg-slate-700 text-white font-bold hover:bg-slate-600 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">Niños (3-12 años)</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setChildren(Math.max(0, children - 1))}
                          className="h-6 w-6 rounded-lg bg-slate-700 text-white font-bold hover:bg-slate-600 flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="w-4 text-center font-black text-xs">{children}</span>
                        <button
                          type="button"
                          onClick={() => setChildren(children + 1)}
                          className="h-6 w-6 rounded-lg bg-slate-700 text-white font-bold hover:bg-slate-600 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">Bebés (0-2 años)</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setBabies(Math.max(0, babies - 1))}
                          className="h-6 w-6 rounded-lg bg-slate-700 text-white font-bold hover:bg-slate-600 flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="w-4 text-center font-black text-xs">{babies}</span>
                        <button
                          type="button"
                          onClick={() => setBabies(babies + 1)}
                          className="h-6 w-6 rounded-lg bg-slate-700 text-white font-bold hover:bg-slate-600 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-slate-700/60 text-center text-[11px] font-black text-amber-400">
                      Total: {totalGuests} {totalGuests === 1 ? "persona" : "personas"}
                    </div>
                  </div>

                  {/* Ocasión Especial */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Ocasión especial (opcional)</label>
                    <input
                      type="text"
                      value={specialOccasion}
                      onChange={(e) => setSpecialOccasion(e.target.value)}
                      placeholder="Ej. Aniversario, sorpresa, cumpleaños..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  {/* Toggles Rápidos: Mascota y Vegetariana */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/40 p-2.5">
                      <span className="text-xs font-bold text-slate-300">🐾 Mascota</span>
                      <button
                        type="button"
                        onClick={() => setHasPet(!hasPet)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-black transition-all ${
                          hasPet ? "bg-amber-500 text-slate-950" : "bg-slate-700 text-slate-300"
                        }`}
                      >
                        {hasPet ? "Sí" : "No"}
                      </button>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/40 p-2.5">
                      <span className="text-xs font-bold text-slate-300">🥗 Menú Veggie</span>
                      <button
                        type="button"
                        onClick={() => setIsVegetarian(!isVegetarian)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-black transition-all ${
                          isVegetarian ? "bg-amber-500 text-slate-950" : "bg-slate-700 text-slate-300"
                        }`}
                      >
                        {isVegetarian ? "Sí" : "No"}
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer Fijo con Botones */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  Cancelar (Esc)
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-black text-slate-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 transition-all disabled:opacity-50"
                >
                  <Sparkles size={15} />
                  {loading ? "Registrando..." : "Guardar Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
