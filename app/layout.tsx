import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hospitality CRM — Hoteles & Experiencias",
  description: "CRM Multi-Tenant para Hoteles y Refugios de Experiencias.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full antialiased font-sans">
      <body className="min-h-full bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}