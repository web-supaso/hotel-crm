"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";

export default function ScoreAction({ leadId }: { leadId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function runScore() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/score`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al puntuar");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button onClick={runScore} disabled={loading} className="min-w-[160px]">
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Puntuando…
          </>
        ) : (
          <>
            <Sparkles size={16} /> Ejecutar scoring LLM
          </>
        )}
      </Button>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}