"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime, INTERACTION_TYPE_LABELS } from "@/lib/labels";
import type { Interaction } from "@/lib/types";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { Plus, Trash2, Phone, Mail, CalendarCheck, FileText, Home, PenLine } from "lucide-react";

function typeIcon(type: Interaction["type"]) {
  const icons: Record<Interaction["type"], React.ReactNode> = {
    call: <Phone size={15} />,
    email: <Mail size={15} />,
    meeting: <CalendarCheck size={15} />,
    site_visit: <Home size={15} />,
    rfp: <FileText size={15} />,
    proposal: <FileText size={15} />,
    contract: <PenLine size={15} />,
    other: <Plus size={15} />,
  };
  return icons[type];
}

const TYPE_COLOR: Record<Interaction["type"], string> = {
  call: "bg-blue-50 text-blue-600",
  email: "bg-emerald-50 text-emerald-600",
  meeting: "bg-purple-50 text-purple-600",
  site_visit: "bg-teal-50 text-teal-600",
  rfp: "bg-amber-50 text-amber-600",
  proposal: "bg-orange-50 text-orange-600",
  contract: "bg-rose-50 text-rose-600",
  other: "bg-slate-100 text-slate-500",
};

export default function InteractionList({
  leadId,
  interactions,
}: {
  leadId: string;
  interactions: Interaction[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [form, setForm] = useState({
    type: "call",
    direction: "outbound",
    summary: "",
    contact_name: "",
    contact_role: "",
    occurred_at: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/leads/${leadId}/interactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Error al guardar interacción");
      setLoading(false);
      return;
    }

    setOpen(false);
    setForm({ type: "call", direction: "outbound", summary: "", contact_name: "", contact_role: "", occurred_at: "" });
    router.refresh();
  }

  async function removeInteraction(id: string) {
    const res = await fetch(`/api/leads/${leadId}/interactions?interaction_id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={() => setOpen(true)} variant="secondary">
          <Plus size={16} /> Registrar interacción
        </Button>
      </div>

      {open && (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Tipo</label>
              <Select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {Object.entries(INTERACTION_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Dirección</label>
              <Select
                value={form.direction}
                onChange={(e) => setForm({ ...form, direction: e.target.value })}
              >
                <option value="outbound">Outbound (nosotros)</option>
                <option value="inbound">Inbound (cliente)</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Fecha</label>
              <Input
                type="datetime-local"
                value={form.occurred_at}
                onChange={(e) => setForm({ ...form, occurred_at: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Contacto (stakeholder)
              </label>
              <Input
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                placeholder="Nombre"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Rol</label>
              <Input
                value={form.contact_role}
                onChange={(e) => setForm({ ...form, contact_role: e.target.value })}
                placeholder="Ej: Event Coordinator"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Resumen</label>
            <Textarea
              rows={2}
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="Qué se habló, compromisos, próximos pasos…"
            />
          </div>
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      )}

      {interactions.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          Sin interacciones registradas.
        </p>
      ) : (
        <ul className="space-y-2">
          {interactions.map((i) => (
            <li
              key={i.id}
              className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3"
            >
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TYPE_COLOR[i.type]}`}
              >
                {typeIcon(i.type)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">
                    {INTERACTION_TYPE_LABELS[i.type]}
                  </span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                    {i.direction}
                  </span>
                  <span className="text-xs text-slate-500">{formatDateTime(i.occurred_at)}</span>
                </div>
                {(i.contact_name || i.contact_role) && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {i.contact_name ?? "Anónimo"}
                    {i.contact_role ? ` · ${i.contact_role}` : ""}
                  </p>
                )}
                {i.summary && <p className="mt-1 text-sm text-slate-700">{i.summary}</p>}
              </div>
              <button
                onClick={() => removeInteraction(i.id)}
                className="text-slate-300 transition-colors hover:text-rose-600"
                title="Eliminar"
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}