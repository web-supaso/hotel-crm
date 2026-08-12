import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  enrichLead,
  forecastByMonth,
  pipelineSummary,
  stuckDeals,
} from "@/lib/revenue";
import { formatCurrency } from "@/lib/labels";
import { Card, ScoreRing, PriorityBadge } from "@/components/ui";
import type { ScoreSnapshot } from "@/lib/types";
import { ArrowUpRight, AlertTriangle, Clock, Users } from "lucide-react";
import ForecastChart from "./components/forecast-chart";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
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

  const enriched = (leads ?? []).map((lead) =>
    enrichLead(
      lead,
      interactionRows.filter((i: (typeof interactionRows)[number]) => i.lead_id === lead.id),
      latestByLead.get(lead.id) ?? null,
    ),
  );

  const summary = pipelineSummary(enriched);
  const forecast = forecastByMonth(enriched);
  const stuck = stuckDeals(enriched);
  const hotLeads = enriched.filter((l) => l.status === "hot");

  const kpis = [
    {
      label: "Pipeline abierto",
      value: summary.openCount,
      sub: `${summary.hot} hot · ${summary.warm} warm · ${summary.cold} cold`,
      icon: Users,
    },
    {
      label: "Revenue ponderado",
      value: formatCurrency(summary.weightedRevenue),
      sub: `Potencial: ${formatCurrency(summary.totalPotential)}`,
      icon: ArrowUpRight,
    },
    {
      label: "Score promedio",
      value: summary.avgScore,
      sub: "promedio de overall_score",
      icon: null,
    },
    {
      label: "Deals bloqueados",
      value: stuck.length,
      sub: `estimated_close_days vencido`,
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Revenue intelligence — actualizado por scoring LLM
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {kpi.label}
                </p>
                <p className="mt-2 text-2xl font-bold">{kpi.value}</p>
                <p className="mt-1 text-xs text-slate-500">{kpi.sub}</p>
              </div>
              {kpi.icon && (
                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                  <kpi.icon size={18} />
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Forecast + health */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            Forecast ponderado de revenue
          </h2>
          <ForecastChart data={forecast} />
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Health del pipeline</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between">
              <span className="text-slate-500">Lead silencioso &gt;45 días</span>
              <span className={`font-semibold ${summary.silent > 0 ? "text-rose-600" : "text-slate-700"}`}>
                {summary.silent}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-slate-500">Single-threaded (committee &lt;50)</span>
              <span className={`font-semibold ${summary.singleThreaded > 0 ? "text-amber-600" : "text-slate-700"}`}>
                {summary.singleThreaded}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-slate-500">Escalados a manager</span>
              <span className={`font-semibold ${summary.escalations > 0 ? "text-amber-600" : "text-slate-700"}`}>
                {summary.escalations}
              </span>
            </li>
          </ul>

          {stuck.length > 0 && (
            <div className="mt-4 rounded-lg bg-amber-50 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                <AlertTriangle size={14} /> Deals con fecha vencida
              </p>
              <ul className="space-y-1">
                {stuck.slice(0, 4).map((l) => (
                  <li key={l.id} className="text-xs text-amber-700">
                    {l.name} — score {l.latest_score?.overall_score}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      {/* Hot leads */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Leads calientes</h2>
          <Link href="/leads" className="text-xs font-medium text-indigo-600 hover:underline">
            Ver todo
          </Link>
        </div>
        {hotLeads.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Sin leads HOT por ahora. Ejecuta el scoring para descubrirlos.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-4 font-medium">Lead</th>
                  <th className="pb-2 pr-4 font-medium">Score</th>
                  <th className="pb-2 pr-4 font-medium">Prob. cierre</th>
                  <th className="pb-2 pr-4 font-medium">Prioridad</th>
                  <th className="pb-2 font-medium">Próxima acción</th>
                </tr>
              </thead>
              <tbody>
                {hotLeads.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4">
                      <Link href={`/leads/${l.id}`} className="font-medium text-indigo-600 hover:underline">
                        {l.name}
                      </Link>
                      <p className="text-xs text-slate-500">{l.company ?? "—"}</p>
                    </td>
                    <td className="py-3">
                      <ScoreRing score={l.latest_score?.overall_score ?? 0} size={40} />
                    </td>
                    <td className="py-3 pr-4 font-medium">
                      {l.latest_score?.predicted_close_probability ?? "—"}%
                    </td>
                    <td className="py-3 pr-4">
                      {l.latest_score && <PriorityBadge priority={l.latest_score.priority_level} />}
                    </td>
                    <td className="py-3 text-xs text-slate-600">
                      {l.latest_score?.next_best_action ?? "—"}
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