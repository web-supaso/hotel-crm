import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 22V6.5L3 10V6l7-3.5L17 6v4l-7-3.5V22" />
              <path d="M17 12v10" />
              <path d="M21 16v6" />
            </svg>
          </div>
          <h1 className="text-xl font-bold">Hotel CRM</h1>
          <p className="text-sm text-slate-500">Revenue Intelligence para tu pipeline</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}