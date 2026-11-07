-- CumulusFit schema. Paste into the Supabase SQL Editor and click Run.
-- Safe to run more than once.
--
-- Anonymous users get the `authenticated` role plus a real auth.uid(), so the
-- policies below cover them. Each user can only reach their own rows.

create table if not exists public.routines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null,
  description text not null default '',
  exercises   jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

-- One row per completed set. session_id groups the sets of one workout, which
-- is what the recap reads. Next-session targets read the latest rows for an
-- exercise_name. The unique constraint stops a double tap logging a set twice.
create table if not exists public.set_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id    uuid not null,
  -- Null when the workout came from a built-in preset, which has no routines row.
  routine_id    uuid references public.routines (id) on delete set null,
  exercise_name text not null,
  set_index     integer not null check (set_index >= 0),
  reps          integer not null check (reps >= 0),
  weight        numeric(6, 2) not null check (weight >= 0),
  unit          text not null default 'lb' check (unit in ('lb', 'kg')),
  completed_at  timestamptz not null default now(),
  unique (session_id, exercise_name, set_index)
);

create index if not exists routines_user_created_idx
  on public.routines (user_id, created_at desc);

create index if not exists set_logs_user_exercise_idx
  on public.set_logs (user_id, exercise_name, completed_at desc);

alter table public.routines enable row level security;
alter table public.set_logs enable row level security;

grant select, insert, update, delete on public.routines to authenticated;
grant select, insert, update, delete on public.set_logs to authenticated;

drop policy if exists "Users manage their own routines" on public.routines;
create policy "Users manage their own routines"
  on public.routines for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own set logs" on public.set_logs;
create policy "Users manage their own set logs"
  on public.set_logs for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
