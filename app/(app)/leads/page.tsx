import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { enrichLead } from "@/lib/revenue";
import { formatCurrency, formatDate } from "@/lib/labels";
import { Card, StatusBadge, ScoreRing } from "@/components/ui";
import NewLeadForm from "./components/new-lead-form";
import { ArrowUpRight, Inbox } from "lucide-react";
import type { ScoreSnapshot } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; s?: string }>;
}) {
  const { status, s } = await searchParams;
  const supabase = createAdminClient();

  const [{ data: leads }, { data: interactions }, { data: scores }] =
    await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("interactions").select("lead_id, contact_name, occurred_at"),
      supabase
        .from("score_snapshots")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

  const interactionRows = (interactions ?? []) as {
    lead_id: string;
    contact_name: string | null;
    occurred_at: string;
  }[];
  const angleRows = (scores ?? []) as (ScoreSnapshot & Record<string, unknown>)[];
  const latestByLead = new Map<string, ScoreSnapshot>();
  for (const s of angleRows) {
    const snap = s as ScoreSnapshot;
    if (!latestByLead.has(snap.lead_id)) latestByLead.set(snap.lead_id, snap);
  }

  let list = (leads ?? []).map((lead) =>
    enrichLead(
      lead,
      interactionRows.filter((i: (typeof interactionRows)[number]) => i.lead_id === lead.id),
      latestByLead.get(lead.id) ?? null,
    ),
  );

  list = list.sort((a, b) => {
    const rank = { hot: 0, warm: 1, unknown: 2, cold: 3, closed_won: 4, closed_lost: 5 };
    return (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
  });

  if (status) list = list.filter((l) => l.status === status);
  if (s) {
    const q = s.toLowerCase();
    list = list.filter(
      (l) => l.name.toLowerCase().includes(q) || (l.company ?? "").toLowerCase().includes(q),
    );
  }

  const filters = [
    { key: "", label: "Todos" },
    { key: "hot", label: "Hot" },
    { key: "warm", label: "Warm" },
    { key: "cold", label: "Cold" },
    { key: "unknown", label: "Sin score" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads & Pipeline</h1>
          <p className="text-sm text-slate-500">{list.length} leads en vista</p>
        </div>
        <NewLeadForm />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={f.key ? `/leads?status=${f.key}` : "/leads"}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              (status ?? "") === f.key
                ? "bg-indigo-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <Card>
        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Inbox size={28} className="text-slate-300" />
            <p className="text-sm text-slate-500">No hay leads todavía. Crea el primero abajo.</p>
            <NewLeadForm />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">Lead</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Prob.</th>
                  <th className="px-4 py-3 font-medium">Valor est.</th>
                  <th className="px-4 py-3 font-medium">Contactos</th>
                  <th className="px-4 py-3 font-medium">Última act.</th>
                  <th className="px-4 py-3 font-medium">En pipeline</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {list.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <Link href={`/leads/${l.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                        {l.name}
                      </Link>
                      <p className="text-xs text-slate-500">{l.company ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="px-4 py-3">
                      <ScoreRing score={l.latest_score?.overall_score ?? 0} size={40} />
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {l.latest_score?.predicted_close_probability ?? "—"}%
                    </td>
                    <td className="px-4 py-3">{formatCurrency(l.deal_value_estimate)}</td>
                    <td className="px-4 py-3">{l.unique_stakeholders}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {l.last_interaction_at ? formatDate(l.last_interaction_at) : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{l.days_in_pipeline}d</td>
                    <td className="px-4 py-3">
                      <Link href={`/leads/${l.id}`} className="text-slate-400 hover:text-indigo-600">
                        <ArrowUpRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}