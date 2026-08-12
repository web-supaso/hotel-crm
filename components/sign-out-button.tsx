"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      title="Cerrar sesión"
      className="p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 rounded-lg"
    >
      <LogOut size={16} />
    </button>
  );
}