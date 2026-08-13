import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import type { LeadStatus, ReservationStatus } from "@/lib/types";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const styles = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
    secondary: "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50",
    danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm",
    ghost: "text-slate-600 hover:bg-slate-100",
  };

  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-bold transition-all disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 ${className}`}
      {...props}
    />
  );
}

export function Select({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 ${className}`}
      {...props}
    />
  );
}

export function StatusBadge({ status }: { status: LeadStatus | ReservationStatus | string }) {
  const styles: Record<string, string> = {
    nuevo: "bg-blue-100 text-blue-700",
    contactado: "bg-amber-100 text-amber-800",
    propuesta_enviada: "bg-purple-100 text-purple-700",
    negociacion: "bg-indigo-100 text-indigo-700",
    convertido: "bg-emerald-100 text-emerald-800",
    descartado: "bg-slate-100 text-slate-600",
    pendiente_pago: "bg-amber-100 text-amber-800",
    senada: "bg-indigo-100 text-indigo-700",
    confirmada: "bg-emerald-100 text-emerald-800",
    in_house: "bg-purple-100 text-purple-700",
    checkout: "bg-blue-100 text-blue-700",
    completada: "bg-slate-100 text-slate-700",
    cancelada: "bg-rose-100 text-rose-700",
  };

  const label = status ? status.replace("_", " ").toUpperCase() : "DESCONOCIDO";
  const color = styles[status] || "bg-slate-100 text-slate-700";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${color}`}>
      {label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string | null }) {
  const p = priority || "normal";
  return (
    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
      {p}
    </span>
  );
}

export function TrajectoryBadge({ trend }: { trend: string | null }) {
  return (
    <span className="text-[10px] font-bold text-slate-500">
      {trend || "estable"}
    </span>
  );
}

export function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score));
  const offset = circumference - (progress / 100) * circumference;

  let color = "text-emerald-500";
  if (score < 40) color = "text-rose-500";
  else if (score < 70) color = "text-amber-500";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-100 fill-none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${color} fill-none transition-all duration-500`}
        />
      </svg>
      <span className="absolute text-xs font-black text-slate-800">{score}</span>
    </div>
  );
}