"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { SEGMENTS, SOURCES, COMPANY_SIZES } from "@/lib/labels";
import { Plus, X } from "lucide-react";

export default function NewLeadForm({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    company: "",
    company_segment: "",
    company_size: "",
    source: "inbound",
    deal_value_estimate: "",
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        deal_value_estimate: form.deal_value_estimate
          ? Number(form.deal_value_estimate)
          : null,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al crear lead");
      setLoading(false);
      return;
    }

    setOpen(false);
    setForm({
      name: "",
      company: "",
      company_segment: "",
      company_size: "",
      source: "inbound",
      deal_value_estimate: "",
      notes: "",
    });
    router.refresh();
    router.push(`/leads/${data.id}`);
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} /> {compact ? "Crear lead" : "Nuevo lead"}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Nuevo lead</h2>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Nombre del contacto *
              </label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: María González"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Empresa</label>
              <Input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Ej: Grupo Costa Azul"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Segmento</label>
              <Select
                value={form.company_segment}
                onChange={(e) => setForm({ ...form, company_segment: e.target.value })}
              >
                <option value="">— Selecciona —</option>
                {SEGMENTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Tamaño</label>
              <Select
                value={form.company_size}
                onChange={(e) => setForm({ ...form, company_size: e.target.value })}
              >
                <option value="">— Selecciona —</option>
                {COMPANY_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s} empleados
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Origen</label>
              <Select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Valor estimado (USD)
              </label>
              <Input
                type="number"
                min="0"
                value={form.deal_value_estimate}
                onChange={(e) => setForm({ ...form, deal_value_estimate: e.target.value })}
                placeholder="Ej: 18000"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Notas</label>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Contexto, referencias, objeciones…"
            />
          </div>

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creando…" : "Crear lead"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}