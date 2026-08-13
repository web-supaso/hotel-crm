"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, AlertTriangle, Clock, Moon, Inbox, CheckCircle2 } from "lucide-react";

interface Alert {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  href: string;
  severity: "warning" | "info" | "urgent";
}

export function AlertsBell() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAlerts(data);
        } else if (data && Array.isArray(data.alerts)) {
          setAlerts(data.alerts);
        } else {
          setAlerts([]);
        }
      })
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const alertsList = Array.isArray(alerts) ? alerts : [];
  const urgentCount = alertsList.filter((a) => a.severity === "warning" || a.severity === "urgent").length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition-colors hover:bg-slate-50 shadow-sm"
        title="Alertas operativas"
      >
        <Bell size={17} />
        {urgentCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm">
            {urgentCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-96 rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 px-5 py-3.5">
              <p className="text-sm font-bold text-slate-900">Alertas Operativas & Comerciales</p>
              <p className="text-xs text-slate-400">
                {alertsList.length} notificaciones activas
              </p>
            </div>
            <div className="max-h-96 overflow-y-auto p-3 space-y-2">
              {loading ? (
                <p className="p-4 text-center text-xs text-slate-400">Cargando alertas…</p>
              ) : alertsList.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 space-y-1">
                  <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2" />
                  <p className="font-bold text-slate-700">¡Todo al día!</p>
                  <p className="text-slate-400">Sin alertas pendientes de atención.</p>
                </div>
              ) : (
                alertsList.map((a) => (
                  <Link
                    key={a.id}
                    href={a.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition-colors hover:bg-slate-100/80"
                  >
                    <p className="text-xs font-bold text-slate-900">{a.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{a.subtitle}</p>
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