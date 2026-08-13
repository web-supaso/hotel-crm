"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

export function LoginForm() {
  const [email, setEmail] = useState("h@v.com");
  const [password, setPassword] = useState("123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: password.trim() });

    if (error) {
      setError("Credenciales inválidas. Revisa tu email/contraseña.");
      setLoading(false);
      return;
    }

    router.push("/leads");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl max-w-sm w-full mx-auto">
      <div>
        <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-700">Email</label>
        <div className="relative">
          <Mail size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <Input
            type="email"
            required
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            placeholder="tu@hotel.com"
            autoComplete="email"
            className="pl-10 font-medium"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-700">Contraseña</label>
        <div className="relative">
          <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <Input
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            className="pl-10 pr-10 font-medium"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-2.5 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-100">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full py-3 text-sm font-black shadow-md">
        {loading ? "Ingresando…" : "Ingresar al CRM"}
      </Button>

      <p className="text-center text-[11px] text-slate-400 pt-1 font-medium">
        Hospitality CRM • Acceso Seguro Multi-Tenant
      </p>
    </form>
  );
}