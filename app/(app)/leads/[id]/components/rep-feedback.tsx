"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { MessageSquarePlus } from "lucide-react";

export default function RepFeedback({
  leadId,
  snapshotId,
}: {
  leadId: string;
  snapshotId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (!snapshotId) return null;

  async function save() {
    if (!feedback.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/leads/${leadId}/score`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snapshot_id: snapshotId, rep_feedback: feedback.trim() }),
    });
    setLoading(false);
    if (res.ok) {
      setOpen(false);
      setFeedback("");
      router.refresh();
    }
  }

  return (
    <div className="mt-5 border-t border-slate-100 pt-4">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-indigo-600"
        >
          <MessageSquarePlus size={14} /> Dejar feedback para recalibrar la IA
        </button>
      ) : (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-600">
            ¿Qué opina el vendedor sobre este score? (se usa para calibración)
          </label>
          <Input
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Ej: el lead ya confirmó presupuesto, el score debería ser más alto"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={loading || !feedback.trim()}>
              {loading ? "Guardando…" : "Guardar feedback"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}