"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, AlertTriangle, Clock, Moon, Inbox } from "lucide-react";

interface Alert {
  type: "urgent" | "follow_up" | "stuck" | "silent" | "gap";
  lead_id: string;
  lead_name: string;
  message: string;
  days: number;
}

const TYPE_STYLE: Record<string, string> = {
  urgent: "bg-red-50 border-red-200 text-red-700",
  follow_up: "bg-amber-50 border-amber-200 text-amber-700",
  stuck: "bg-orange-50 border-orange-200 text-orange-700",
  silent: "bg-slate-50 border-slate-200 text-slate-600",
  gap: "bg-indigo-50 border-indigo-200 text-indigo-700",
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  urgent: <AlertTriangle size={14} />,
  follow_up: <Clock size={14} />,
  stuck: <AlertTriangle size={14} />,
  silent: <Moon size={14} />,
  gap: <Inbox size={14} />,
};

export function AlertsBell() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((data: Alert[]) => setAlerts(data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const urgentCount = alerts.filter((a) => a.type === "urgent").length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-50"
        title="Alertas"
      >
        <Bell size={17} />
        {urgentCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
            {urgentCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-96 rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold">Alertas de pipeline</p>
              <p className="text-xs text-slate-500">
                {alerts.length} acciones pendientes
              </p>
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {loading ? (
                <p className="p-4 text-center text-xs text-slate-400">Cargando…</p>
              ) : alerts.length === 0 ? (
                <p className="p-4 text-center text-xs text-slate-400">
                  Sin alertas. Pipeline saludable ✓
                </p>
              ) : (
                alerts.map((a, i) => (
                  <Link
                    key={`${a.lead_id}-${i}`}
                    href={`/leads/${a.lead_id}`}
                    onClick={() => setOpen(false)}
                    className={`mb-1.5 flex items-start gap-2.5 rounded-lg border p-2.5 transition-opacity hover:opacity-80 ${TYPE_STYLE[a.type]}`}
                  >
                    <span className="mt-0.5">{TYPE_ICON[a.type]}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">{a.lead_name}</p>
                      <p className="text-xs opacity-80">{a.message}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}