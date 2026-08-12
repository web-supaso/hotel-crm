-- v2 del scoring: campos nuevos de score_snapshots
alter table public.score_snapshots
  add column if not exists trajectory_trend text,
  add column if not exists pre_call_briefing text,
  add column if not exists objection_risk text,
  add column if not exists active_learning_note text,
  add column if not exists rep_feedback text;

-- Se almacena el feedback del rep sobre la predicción anterior (active learning).
-- Lo guardamos sobre el snapshot, referenciando el lead padre vía join (lead_id ya existe).