# Hotel CRM — Revenue Intelligence

CRM predictivo de leads para un hotel. Clasifica cada lead con un scoring LLM (Gemini),
proyecta revenue ponderado y genera alertas accionables. 100% sobre capas gratuitas.

```
Frontend/API   → Vercel (Hobby)      — Next.js 16 (App Router)
Base + Auth    → Supabase (Free)     — Postgres, RLS, Storage
LLM Scoring    → Google Gemini       — AI Studio API (free tier)
CI/Repo        → GitHub + Actions    — lint + tsc + build
Email (futuro) → Resend (3k/mes)     — notificaciones
```

## Flujo del scoring

El prompt del lead vive en `lib/ai/prompt.ts` (basado en `prompt.txt`): calcula
intent/engagement/ICP/committee 0-100, aplica `OVERALL = (0.35·INTENT + 0.25·ENGAGE +
0.20·ICP + 0.20·COMMITTEE) − RISK_PENALTY` y clasifica hot/warm/cold/unknown.
Cada salida se guarda en `score_snapshots` (historial + `ground_truth` para calibración).

```
Vercel Cron (7am UTC)  →  /api/cron/daily  →  ¿nuevas interacciones? → rescoring
                            └─ deals bloqueados / follow-ups vencidos → /api/alerts
```

## Estructura

```
app/
  (app)/dashboard/        KPIs, forecast ponderado, health, hot leads
  (app)/leads/            pipeline con filtros + creación
  (app)/leads/[id]/       detalle: score, dimensiones, señales, datos faltantes, interacciones
  login/                  auth single-admin
  api/
    leads/                CRUD + listado enriquecido
    leads/[id]/score/     scoring LLM + ground_truth
    leads/[id]/interactions/
    alerts/               señales accionables
    cron/daily/           rescoring + detección de bloqueos
components/               UI (Badge, ScoreRing, AlertsBell…)
lib/
  ai/                     prompt + adapter Gemini
  supabase/               client / server / admin (service role)
  revenue.ts              forecast, health, enrich
  types.ts
supabase/migrations/      0001_init.sql (schema + seed + RLS)
```

## Deploy en capas gratuitas (paso a paso)

### 1. Supabase (5 min)

1. Crea un proyecto en [supabase.com](https://supabase.com) → *New project* (región cercana).
2. Ve a **SQL Editor** y pega el contenido de `supabase/migrations/0001_init.sql` → Run.
3. Crea tu usuario admin en **Authentication → Users → Invite user** (email + contraseña).
   Habilita **Email → Confirm email = OFF** para que entre directo.
4. Copia de **Project Settings → API**: URL, anon key y service_role key.

### 2. API key de Gemini (gratis, sin tarjeta)

1. Entra a [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → *Create API key*.
2. Fíjate qué `GEMINI_MODEL` tienes disponible en tu región (por defecto `gemini-2.0-flash`).

### 3. Variables de entorno

Copia `.env.example` → `.env.local` y rellena las 4 claves.

### 4. Vercel (Hobby, gratis)

1. Sube el repo a **GitHub**.
2. En [vercel.com](https://vercel.com) → *Add New… → Project* → importa el repo.
3. En **Settings → Environment Variables** agrega las 4 claves anteriores.
4. **Deploy**. Vercel detectará `vercel.json` y activará el cron diario automáticamente.

> ⚠️ **Supabase Free duerme tu proyecto tras ~7 días sin actividad.** El cron de Vercel
> hace pings regulares a la API, lo que lo mantiene despierto si hay tráfico; si se apaga,
> entra a Supabase → Settings → *Restore* (gratis) o toca la app una vez.

### 5. GitHub CI

Agrega las mismas 4 claves en **repo → Settings → Secrets and variables → Actions**.

## Uso local

```bash
npm install
npm run dev        # http://localhost:3000
```

## Próximos pasos (fases del resumen.txt)

- **Calibración**: `ground_truth` ya se guarda al marcar ganado/perdido; falta un job mensual
  de Brier score (ver `lib/revenue.ts` de referencia).
- **Notificaciones**: conectar Resend a `/api/alerts` para email real.
- **Integraciones**: enrichment (Clearbit/Apollo) alimentando `company_size`/`segment`.

## Scripts

```bash
npm run dev        # desarrollo
npm run build      # build de producción
npm run lint       # eslint
npm start          # servir build
```