import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LayoutDashboard, Users, Calendar, CheckCircle2, Hotel, Sparkles } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { AlertsBell } from "@/components/alerts-bell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const nav = [
    { href: "/leads", label: "Pipeline & Leads", icon: Users },
    { href: "/availability", label: "Rack & Ocupación", icon: Calendar },
    { href: "/reservations", label: "Reservas & Check-in", icon: CheckCircle2 },
    { href: "/dashboard", label: "Dashboard & Métricas", icon: LayoutDashboard },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col border-r border-slate-200 bg-white z-20 shadow-sm">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
            <Hotel size={20} />
          </div>
          <div>
            <p className="text-sm font-extrabold leading-tight text-slate-900">Hospitality CRM</p>
            <p className="text-[11px] font-medium text-slate-400">Hoteles & Experiencias</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-4 flex flex-col gap-1.5 px-3.5">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-600 transition-all hover:bg-indigo-50 hover:text-indigo-700"
            >
              <item.icon size={17} />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Multi-Tenant Status Badge */}
        <div className="mt-auto border-t border-slate-100 p-4 space-y-3">
          <div className="flex items-center gap-2 rounded-xl bg-indigo-50/70 px-3 py-2 text-indigo-900 border border-indigo-100/60">
            <Sparkles size={14} className="text-indigo-600 shrink-0" />
            <p className="text-[11px] font-semibold leading-tight">
              Multi-Tenant Activo • Supabase RLS
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-slate-800">{user.email ?? "Admin"}</p>
              <span className="text-[10px] font-medium text-emerald-600">● En línea</span>
            </div>
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="ml-64 flex-1 px-8 py-8">
        <div className="mb-4 flex items-center justify-end">
          <AlertsBell />
        </div>
        {children}
      </main>
    </div>
  );
}