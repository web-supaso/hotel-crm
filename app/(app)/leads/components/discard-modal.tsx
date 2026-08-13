"use client";

import { useState, useEffect } from "react";
import { X, AlertCircle, Check } from "lucide-react";
import type { DiscardReason } from "@/lib/types";

interface DiscardModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  guestName: string;
  organizationId: string;
  onSuccess: () => void;
}

export function DiscardModal({
  isOpen,
  onClose,
  leadId,
  guestName,
  organizationId,
  onSuccess,
}: DiscardModalProps) {
  const [reasons, setReasons] = useState<DiscardReason[]>([]);
  const [selectedReasonId, setSelectedReasonId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    async function loadReasons() {
      try {
        const res = await fetch(`/api/discard-reasons?organization_id=${organizationId}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setReasons(data);
          if (data.length > 0) setSelectedReasonId(data[0].id);
        }
      } catch (e) {
        console.error("Error al cargar motivos de descarte:", e);
      }
    }
    loadReasons();
  }, [isOpen, organizationId]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedReasonId) {
      setError("Debes seleccionar un motivo de descarte.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "descartado",
          discard_reason_id: selectedReasonId,
          discard_notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al descartar el lead");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-rose-600">
            <AlertCircle size={20} />
            <h2 className="text-lg font-bold text-slate-900">Descartar Lead</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-600">
          ¿Por qué se descarta la solicitud de <span className="font-semibold text-slate-900">{guestName}</span>? Selecciona el motivo estandarizado para analítica comercial:
        </p>

        {error && (
          <div className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Motivo de Descarte (Obligatorio)
            </label>
            <select
              value={selectedReasonId}
              onChange={(e) => setSelectedReasonId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
              required
            >
              {reasons.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Detalle u Observación adicional
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Buscaba habitación cuádruple para enero y no teníamos cupo..."
              rows={3}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
            >
              <Check size={16} />
              {loading ? "Guardando..." : "Confirmar Descarte"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
