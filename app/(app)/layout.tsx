import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Gauge, Users, RefreshCcw, Hotel } from "lucide-react";
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
    { href: "/dashboard", label: "Dashboard", icon: Gauge },
    { href: "/leads", label: "Leads & Pipeline", icon: Users },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Hotel size={18} />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">Hotel CRM</p>
            <p className="text-[11px] text-slate-500">Revenue Intelligence</p>
          </div>
        </div>
        <nav className="mt-2 flex flex-col gap-1 px-3">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <item.icon size={17} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-slate-200 p-4">
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <RefreshCcw size={14} className="text-slate-400" />
            <p className="text-[11px] text-slate-500">
              Scoring LLM v1.0 — Gemini
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.email ?? "Admin"}</p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </aside>
      <main className="ml-60 flex-1 px-8 py-8">
        <div className="mb-6 flex items-center justify-end">
          <AlertsBell />
        </div>
        {children}
      </main>
    </div>
  );
}