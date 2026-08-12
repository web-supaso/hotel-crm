"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { CheckCircle2, XCircle } from "lucide-react";
import type { LeadStatus } from "@/lib/types";

export default function CloseButtons({
  leadId,
  status,
  snapshotId,
}: {
  leadId: string;
  status: LeadStatus;
  snapshotId?: string;
}) {
  const [loading, setLoading] = useState<"won" | "lost" | null>(null);
  const router = useRouter();

  if (status === "closed_won" || status === "closed_lost") {
    return (
      <span className="text-xs text-slate-500">
        Cerrado como {status === "closed_won" ? "ganado ✓" : "perdido ✗"}
      </span>
    );
  }

  async function close(reason: "won" | "lost") {
    setLoading(reason);
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ close_reason: reason, snapshot_id: snapshotId }),
    });
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="danger"
        onClick={() => close("lost")}
        disabled={loading !== null}
        title="Marcar como perdido"
      >
        <XCircle size={15} /> Perdido
      </Button>
      <Button
        onClick={() => close("won")}
        disabled={loading !== null}
        title="Marcar como ganado"
      >
        <CheckCircle2 size={15} /> Ganado
      </Button>
    </div>
  );
}