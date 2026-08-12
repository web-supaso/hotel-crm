import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
} from "@/lib/labels";
import { deriveAutomationTriggers } from "@/lib/revenue";
import { Card, StatusBadge, ScoreRing, PriorityBadge, TrajectoryBadge } from "@/components/ui";
import type { Interaction, ScoreSnapshot } from "@/lib/types";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import ScoreAction from "./components/score-action";
import InteractionList from "./components/interaction-list";
import CloseButtons from "./components/close-buttons";
import { DimensionScore } from "./components/dimension-scores";
import RepFeedback from "./components/rep-feedback";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [{ data: lead }, { data: interactions }, { data: scores }] =
    await Promise.all([
      supabase.from("leads").select("*").eq("id", id).single(),
      supabase
        .from("interactions")
        .select("*")
        .eq("lead_id", id)
        .order("occurred_at", { ascending: false }),
      supabase
        .from("score_snapshots")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false }),
    ]);

  if (!lead) notFound();

  const interactionsList = (interactions ?? []) as Interaction[];
  const score = (scores?.[0] ?? null) as ScoreSnapshot | null;

  return (
    <div className="max-w-5xl space-y-6">
      <Link
        href="/leads"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={16} /> Volver al pipeline
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{lead.name}</h1>
            <StatusBadge status={lead.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {lead.company ?? "Sin empresa"} · {lead.company_segment ?? "—"} ·{" "}
            {lead.company_size ?? "—"}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            Origen: {lead.source ?? "—"} · Creado {formatDate(lead.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CloseButtons leadId={lead.id} status={lead.status} snapshotId={score?.id} />
          <ScoreAction leadId={lead.id} />
        </div>
      </div>

      {/* Score */}
      {score ? (
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-8">
            <div className="flex items-center gap-4">
              <ScoreRing score={score.overall_score} size={90} />
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Score</p>
                <p className="text-sm font-semibold">
                  {score.classification}
                  {score.priority_level && (
                    <span className="ml-2 inline-block align-middle">
                      <PriorityBadge priority={score.priority_level} />
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {score.trajectory_trend && (
                    <TrajectoryBadge trend={score.trajectory_trend} />
                  )}{" "}
                  Confianza: {score.confidence ?? "—"}% · Modelo: {score.model}
                </p>
              </div>
            </div>

            <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
              <DimensionScore value={score.dimension_scores.intent} label="Intención" />
              <DimensionScore value={score.dimension_scores.engagement} label="Engagement" />
              <DimensionScore value={score.dimension_scores.icp_fit} label="ICP" />
              <DimensionScore value={score.dimension_scores.committee} label="Comité" />
            </div>

            <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-slate-500">Prob. de cierre</p>
                <p className="text-lg font-bold">{score.predicted_close_probability ?? "—"}%</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Cierre estimado</p>
                <p className="text-lg font-bold">{score.estimated_close_days ?? "—"} días</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Valor potencial</p>
                <p className="text-lg font-bold capitalize">{score.estimated_deal_value_signal}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Follow-up</p>
                <p className="text-lg font-bold">{score.follow_up_days}d</p>
              </div>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
              <div className="col-span-4">
                <p className="text-xs text-slate-500">Próxima acción sugerida</p>
                <p className="mt-1 text-sm font-medium text-indigo-700">
                  {score.next_best_action ?? "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Señales clave
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(score.key_signals ?? []).length === 0 ? (
                  <span className="text-xs text-slate-400">Sin señales detectadas</span>
                ) : (
                  score.key_signals.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700"
                    >
                      {s}
                    </span>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Datos faltantes
              </p>
              <ul className="space-y-1">
                {(score.data_gaps ?? []).length === 0 ? (
                  <li className="text-xs text-slate-400">Sin gaps pendientes</li>
                ) : (
                  score.data_gaps.map((g) => (
                    <li key={g} className="text-xs text-amber-700">
                      • {g}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-600">
              <span className="font-semibold">Razonamiento: </span>
              {score.reasoning ?? "—"}
            </p>
          </div>

          {score.pre_call_briefing && (
            <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                Briefing pre-llamada
              </p>
              <p className="mt-1 text-sm text-slate-700">{score.pre_call_briefing}</p>
            </div>
          )}

          {score.objection_risk && score.objection_risk !== "none" && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
              <AlertTriangle size={13} />
              Riesgo: {score.objection_risk}
            </div>
          )}

          {score.active_learning_note && (
            <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/60 p-3">
              <p className="text-xs text-amber-800">
                <span className="font-semibold">Nota de calibración: </span>
                {score.active_learning_note}
              </p>
            </div>
          )}

          {(() => {
            const leadWithScore = lead ? { ...lead, latest_score: score } : null;
            const triggers = deriveAutomationTriggers(leadWithScore, score);
            if (triggers.length === 0) return null;
            return (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Automatizaciones disparadas
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {triggers.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                    >
                      ⚡ {t}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          <RepFeedback leadId={lead.id} snapshotId={score?.id} />
        </Card>
      ) : (
        <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <p className="text-sm font-medium text-slate-700">
            Este lead aún no tiene scoring predictivo.
          </p>
          <p className="max-w-md text-xs text-slate-500">
            Ejecuta el análisis LLM para obtener la clasificación, probabilidad de cierre y próxima
            acción sugerida.
          </p>
          <ScoreAction leadId={lead.id} />
        </Card>
      )}

      {/* deal value */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
          <div>
            <p className="text-xs text-slate-500">Valor estimado del deal</p>
            <p className="text-xl font-bold">{formatCurrency(lead.deal_value_estimate)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Notas</p>
            <p className="text-sm text-slate-700">{lead.notes ?? "Sin notas"}</p>
          </div>
        </div>
      </Card>

      {/* Interactions */}
      <Card className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">
          Interacciones ({interactionsList.length})
        </h2>
        <InteractionList leadId={lead.id} interactions={interactionsList} />
      </Card>

      {scores && scores.length > 1 && (
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Historial de scores</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                  <th className="pb-2 pr-4 font-medium">Fecha</th>
                  <th className="pb-2 pr-4 font-medium">Score</th>
                  <th className="pb-2 pr-4 font-medium">Clasificación</th>
                  <th className="pb-2 font-medium">Prob.</th>
                </tr>
              </thead>
              <tbody>
                {(scores as ScoreSnapshot[]).map((sc) => (
                  <tr key={sc.id} className="border-b border-slate-100">
                    <td className="py-2 pr-4 text-slate-600">
                      {formatDateTime(sc.created_at)}
                    </td>
                    <td className="py-2 pr-4 font-medium">{sc.overall_score}</td>
                    <td className="py-2 pr-4">
                      <StatusBadge status={sc.classification} />
                    </td>
                    <td className="py-2">{sc.predicted_close_probability ?? "—"}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}