"use client";

import { useState, useEffect } from "react";
import { Building2, Calendar, ChevronLeft, ChevronRight, Bed, UserCheck, ShieldCheck } from "lucide-react";
import type { Organization, Property, Unit } from "@/lib/types";

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AvailabilityRackPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");

  const [currentStartDate, setCurrentStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 2); // Iniciar 2 días antes de hoy
    return d;
  });

  const [units, setUnits] = useState<Unit[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const daysToShow = 14; // Vista de 14 días

  // Generar lista de fechas a mostrar
  const dateColumns: Date[] = [];
  for (let i = 0; i < daysToShow; i++) {
    const d = new Date(currentStartDate);
    d.setDate(d.getDate() + i);
    dateColumns.push(d);
  }

  const startDateStr = formatLocalDate(dateColumns[0]);
  const endDateStr = formatLocalDate(dateColumns[dateColumns.length - 1]);

  // 1. Cargar Organizaciones (priorizando Experiencias con Estilo)
  useEffect(() => {
    async function loadMetadata() {
      try {
        const res = await fetch("/api/organizations");
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setOrganizations(data);
          const savedOrgId = typeof window !== "undefined" ? localStorage.getItem("crm_selected_org_id") : null;
          // Preferir Experiencias con Estilo si no hay guardada
          const defaultOrg = data.find((o: any) => o.name.toLowerCase().includes("experiencias")) || data[0];
          const current = (savedOrgId && data.find((o: any) => o.id === savedOrgId)) || defaultOrg;
          setSelectedOrgId(current.id);
          const props = current.properties || [];
          setProperties(props);
          if (props.length > 0) setSelectedPropertyId(props[0].id);
        }
      } catch (e) {
        console.error("Error al cargar organizaciones:", e);
      }
    }
    loadMetadata();
  }, []);

  // 2. Al cambiar de Org, actualizar propiedades
  useEffect(() => {
    if (!selectedOrgId || organizations.length === 0) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("crm_selected_org_id", selectedOrgId);
    }
    const currentOrg = organizations.find((o) => o.id === selectedOrgId);
    if (currentOrg) {
      const props = (currentOrg as any).properties || [];
      setProperties(props);
      if (props.length > 0) setSelectedPropertyId(props[0].id);
      else setSelectedPropertyId("");
    }
  }, [selectedOrgId, organizations]);

  // 3. Cargar Disponibilidad de la Propiedad para el rango de fechas
  async function fetchAvailability() {
    if (!selectedPropertyId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/availability?property_id=${selectedPropertyId}&start_date=${startDateStr}&end_date=${endDateStr}`
      );
      const data = await res.json();
      setUnits(data.units || []);
      setBookings(data.bookings || []);
    } catch (e) {
      console.error("Error al cargar disponibilidad:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAvailability();
  }, [selectedPropertyId, startDateStr, endDateStr]);

  function navigateDays(days: number) {
    setCurrentStartDate((prev) => {
      const n = new Date(prev);
      n.setDate(n.getDate() + days);
      return n;
    });
  }

  function getBookingForUnitAndDay(unitId: string, day: Date) {
    const dayStr = formatLocalDate(day);
    return bookings.find((b) => {
      if (b.unit_id !== unitId) return false;
      const start = b.start_date;
      const end = b.end_date;
      return dayStr >= start && dayStr < end;
    });
  }

  const todayStr = formatLocalDate(new Date());

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <Calendar size={20} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Rack de Disponibilidad & Ocupación</h1>
            <p className="text-xs text-slate-500">Consulta visual anti-solapamiento de carpas, cabañas y habitaciones</p>
          </div>
        </div>

        {/* Multi-Tenant & Property Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-500 uppercase px-1">Org:</span>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-slate-900 border border-slate-300"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-500 uppercase px-1">Sede:</span>
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-slate-900 border border-slate-300"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Date Navigation & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateDays(-7)}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ChevronLeft size={15} /> -7 Días
          </button>
          <button
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 2);
              setCurrentStartDate(d);
            }}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-200"
          >
            Hoy
          </button>
          <button
            onClick={() => navigateDays(7)}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            +7 Días <ChevronRight size={15} />
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-emerald-100 border border-emerald-400" />
            <span className="text-slate-600">Disponible</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-indigo-500" />
            <span className="text-slate-600">Señada / Confirmada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-purple-600" />
            <span className="text-slate-600">In-House</span>
          </div>
        </div>
      </div>

      {/* Rack Table Grid */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="p-3 text-left font-bold text-slate-700 w-48 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                Unidad / Alojamiento
              </th>
              {dateColumns.map((day, idx) => {
                const dayStr = formatLocalDate(day);
                const isToday = dayStr === todayStr;
                const dayName = day.toLocaleDateString("es-AR", { weekday: "short" });
                const dayNum = day.getDate();
                const monthName = day.toLocaleDateString("es-AR", { month: "short" });

                return (
                  <th
                    key={idx}
                    className={`p-2 text-center font-bold min-w-[70px] border-r border-slate-200 ${
                      isToday ? "bg-indigo-50 text-indigo-700 font-extrabold" : "text-slate-600"
                    }`}
                  >
                    <div className="uppercase text-[10px] tracking-tight">{dayName}</div>
                    <div className="text-sm font-black">{dayNum}</div>
                    <div className="text-[10px] text-slate-400">{monthName}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={daysToShow + 1} className="p-12 text-center text-slate-400 font-medium">
                  Cargando rack de disponibilidad...
                </td>
              </tr>
            ) : units.length === 0 ? (
              <tr>
                <td colSpan={daysToShow + 1} className="p-12 text-center text-slate-400 font-medium">
                  No hay unidades registradas para esta propiedad.
                </td>
              </tr>
            ) : (
              units.map((unit) => (
                <tr key={unit.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="p-3 font-semibold text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-2">
                      <Bed size={15} className="text-indigo-600 shrink-0" />
                      <span className="truncate">{unit.name}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                      Cap: {unit.capacity_people} pers • ${unit.base_price_default.toLocaleString("es-AR")}
                    </p>
                  </td>

                  {dateColumns.map((day, idx) => {
                    const booking = getBookingForUnitAndDay(unit.id, day);
                    const dayStr = formatLocalDate(day);
                    const isToday = dayStr === todayStr;

                    if (booking) {
                      const res = booking.reservation;
                      const isInHouse = res?.status === "in_house";
                      return (
                        <td
                          key={idx}
                          className="p-1 border-r border-slate-100 text-center"
                          title={`Reserva: ${res?.reservation_code} - ${res?.guest_name} (${res?.status})`}
                        >
                          <div
                            className={`h-12 rounded-lg p-1 flex flex-col justify-center items-center text-white font-bold text-[10px] shadow-sm truncate ${
                              isInHouse ? "bg-purple-600" : "bg-indigo-600"
                            }`}
                          >
                            <span className="truncate w-full">{res?.guest_name || "Reservado"}</span>
                            <span className="text-[8px] opacity-80">{res?.reservation_code?.slice(-4)}</span>
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={idx}
                        className={`p-1 border-r border-slate-100 text-center ${
                          isToday ? "bg-indigo-50/30" : ""
                        }`}
                      >
                        <div className="h-12 rounded-lg bg-emerald-50/50 border border-emerald-200/60 flex items-center justify-center text-[10px] text-emerald-700 font-medium hover:bg-emerald-100/60 transition-colors cursor-pointer">
                          Libre
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
