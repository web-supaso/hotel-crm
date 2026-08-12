# RUNBOOK — Reanudar el proyecto al día siguiente

## Punto A: Qué dejamos hecho (12/08)

1. Repo GitHub listo: https://github.com/supaso-hub/hotel-crm (2 commits, CI activo)
2. Base de datos Supabase creada y con tablas (scripts 0001 + 0002 ejecutados OK)
3. `.env.local` = claves de Supabase ya cargadas en local
4. **PENDIENTE**: configurar Vercel + crear API key de Gemini

## Punto B: Retomar (orden exacto)

### 1. Crear key de Gemini (gratis, sin tarjeta)
- Ir a https://aistudio.google.com/apikey → botón "Create API key"
- Copiar la key → ponerla en `D:\2026_crm_prueba\hotel-crm\.env.local` → `GEMINI_API_KEY=...`

### 2. Probar local: ir a `D:\2026_crm_prueba\hotel-crm` en terminal
```bash
npm run dev
```
- Abrir http://localhost:3000 → nos pedirá login de Supabase (Auth → Invite user, ver punto 4)
- Crear un lead, registrar una interacción, click "Ejecutar scoring LLM" (debe llamar a Gemini y guardar score)

### 3. Desplegar en Vercel (gratis)
1. Vercel → Add New → Project → importar repo `supaso-hub/hotel-crm`
2. Abrir "Environment Variables" y cargar estas 4 (los valores están en `.env.local`):

| Nombre | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://rzwqpxkehhpmekksninp.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | el valor `sb_publishable_...` |
| `SUPABASE_SERVICE_ROLE_KEY` | el valor `sb_secret_...` |
| `GEMINI_API_KEY` | la key creada en el paso 1 |

3. Deploy. Esperar el build (1-3 min). URL: `https://hotel-crm.vercel.app`
4. Vercel detecta `vercel.json` y activa el cron diario solo.

> IMPORTANTE: rotá la clave `service_role` porque quedó expuesta en un chat.
> Supabase → Settings → API → "Roll keys" → actualizala en Vercel y en `.env.local`.

### 4. Crear tu usuario admin (para el login)
Supabase → Authentication → Users → Invite user → email tuyo + contraseña.
(Y en Settings → Auth → Email, desactivar "Confirm email" si se quiere entrar directo.)

## Recordatorios
- La app corre con: v1 de scoring = el prompt en `lib/ai/prompt.ts` (v2 con trayectoria, objection_risk, pre_call_briefing, active_learning, triggers determinísticos)
- Archivos clave:
  - `supabase/migrations/0001_init.sql` y `0002_v2_scoring_fields.sql` (ya aplicados)
  - `.env.local` (claves locales, ignorado por git)
  - `README.md` (documentación del proyecto)
- Si algo falla con links de Supabase → usar `app.supabase.com` en incógnito.
- Build local: usar `npx next build --webpack` (en tu Windows Turbopack falla por SWC; en Vercel no hay problema).

## Checkpoint de mañana: "¿dónde iba?"
- [ ] Gemini key creada y en `.env.local`
- [ ] `npm run dev` y CRM corriendo local (login + scoring)
- [ ] Vercel desplegado con las 4 env vars
- [ ] Usuario admin creado en Supabase Auth
- [ ] service_role rotada y re-puesta en Vercel/.env.local