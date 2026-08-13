import { createClient } from "@supabase/supabase-js";

// Solo se usa en server (API routes / route handlers).
// Usa SERVICE_ROLE_KEY: respeta RLS bypass, nunca exponer al cliente.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export const getAdminClient = createAdminClient;