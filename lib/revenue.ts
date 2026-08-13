import type { Lead, Reservation } from "@/lib/types";

export interface PipelineFinancialSummary {
  totalLeads: number;
  activeLeads: number;
  convertedLeads: number;
  conversionRate: number;
  totalRevenue: number;
  totalCollected: number;
  totalPendingBalance: number;
}

export function calculateHospitalityFinancials(
  leads: Lead[],
  reservations: Reservation[]
): PipelineFinancialSummary {
  const totalLeads = leads.length;
  const activeLeads = leads.filter((l) =>
    ["nuevo", "contactado", "propuesta_enviada", "negociacion"].includes(l.status)
  ).length;
  const convertedLeads = leads.filter((l) => l.status === "convertido").length;
  const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  const validReservations = reservations.filter((r) => r.status !== "cancelada");
  const totalRevenue = validReservations.reduce((acc, r) => acc + Number(r.total_price || 0), 0);
  const totalCollected = validReservations.reduce((acc, r) => acc + Number(r.total_paid || 0), 0);
  const totalPendingBalance = validReservations.reduce((acc, r) => acc + Number(r.balance_pending || 0), 0);

  return {
    totalLeads,
    activeLeads,
    convertedLeads,
    conversionRate,
    totalRevenue,
    totalCollected,
    totalPendingBalance,
  };
}