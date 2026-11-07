-- Demo data for one account: four weeks of Push / Legs / Pull workouts with
-- steady progression, a saved Pull Day routine, and gym sessions for the
-- coming week.
--
-- How to use:
--   1. In the app, create an account with "Save your progress".
--   2. Change demo_email (and demo_timezone if needed) below.
--   3. Paste this whole file into the Supabase SQL Editor and click Run.
--   4. Reload the app while logged in to that account.
--
-- Safe to run again: it replaces its own demo rows and leaves everything else.
-- To remove the demo data, see the bottom of this file.

do $$
declare
  demo_email    text := 'arwarren30@gmail.com';  -- <- change this
  demo_timezone text := 'America/New_York'; -- used for the planned gym times
  uid           uuid;
  pull_routine  uuid;
begin
  select id into uid from auth.users where email = demo_email;
  if uid is null then
    raise exception 'No account with email %. Create it in the app first.', demo_email;
  end if;

  -- Fixed ids derived from the account, so a rerun replaces instead of duplicating.
  pull_routine := md5('cumulusfit-demo-routine-' || uid)::uuid;

  delete from public.set_logs
  where user_id = uid
    and session_id in (
      select md5('cumulusfit-demo-' || uid || w || '-' || week)::uuid
      from unnest(array['push', 'legs', 'pull']) as w, generate_series(0, 3) as week
    );
  delete from public.gym_sessions
  where user_id = uid
    and id in (select md5('cumulusfit-demo-gym-' || uid || d)::uuid from generate_series(1, 7) as d);

  insert into public.routines (id, user_id, title, description, exercises, created_at)
  values (
    pull_routine,
    uid,
    'Pull Day',
    'Back and biceps, with face pulls for healthy shoulders.',
    '[
      {"name": "Pull-Up",        "sets": 3, "reps": "5-8",   "rest_seconds": 120, "notes": "Full hang at the bottom."},
      {"name": "Barbell Row",    "sets": 3, "reps": "8-10",  "rest_seconds": 120, "notes": "Pull to the lower ribs."},
      {"name": "Lat Pulldown",   "sets": 3, "reps": "10-12", "rest_seconds": 90,  "notes": ""},
      {"name": "Hammer Curl",    "sets": 3, "reps": "10-12", "rest_seconds": 60,  "notes": ""},
      {"name": "Face Pull",      "sets": 3, "reps": "12-15", "rest_seconds": 60,  "notes": "Elbows high."}
    ]'::jsonb,
    now() - interval '26 days'
  )
  on conflict (id) do update
    set title = excluded.title, description = excluded.description, exercises = excluded.exercises;

  -- Each row is one exercise in a workout. Weight goes up by `step` lb a week
  -- (bodyweight moves add reps instead). `reps` is the final week; earlier weeks
  -- lose a rep on the last set. Workouts land 5, 3 and 1 days into each week.
  insert into public.set_logs
    (user_id, session_id, routine_id, exercise_name, set_index, reps, weight, unit, completed_at)
  select
    uid,
    md5('cumulusfit-demo-' || uid || p.workout || '-' || week)::uuid,
    case when p.workout = 'pull' then pull_routine end,
    p.exercise,
    s.i - 1,
    greatest(1,
      p.reps[s.i]
      - case when p.base = 0 then 3 - week else 0 end
      - case when week < 3 and s.i = cardinality(p.reps) then 1 else 0 end),
    p.base + p.step * week,
    'lb',
    now()
      - make_interval(days => (3 - week) * 7 + p.days_ago)
      + make_interval(mins => p.position * 12 + s.i * 3)
  from (values
    ('push', 5, 1, 'Barbell Bench Press',     135.0, 5.0, array[8, 8, 8]),
    ('push', 5, 2, 'Incline Dumbbell Press',   45.0, 5.0, array[10, 9, 9]),
    ('push', 5, 3, 'Standing Overhead Press',  85.0, 5.0, array[8, 8, 7]),
    ('push', 5, 4, 'Cable Lateral Raises',     15.0, 2.5, array[15, 15, 15, 15]),
    ('push', 5, 5, 'Tricep Rope Pushdowns',    40.0, 5.0, array[12, 11, 10]),
    ('legs', 3, 1, 'Trap Bar Deadlift',       185.0, 10.0, array[5, 5, 5, 5]),
    ('legs', 3, 2, 'Depth Jumps',               0.0, 0.0, array[5, 5, 5]),
    ('legs', 3, 3, 'Bulgarian Split Squats',   30.0, 5.0, array[8, 8, 8]),
    ('legs', 3, 4, 'Tibialis Raises',           0.0, 0.0, array[20, 18, 15]),
    ('pull', 1, 1, 'Pull-Up',                   0.0, 0.0, array[8, 7, 6]),
    ('pull', 1, 2, 'Barbell Row',             115.0, 5.0, array[10, 9, 8]),
    ('pull', 1, 3, 'Lat Pulldown',            100.0, 5.0, array[12, 10, 10]),
    ('pull', 1, 4, 'Hammer Curl',              25.0, 2.5, array[12, 11, 10]),
    ('pull', 1, 5, 'Face Pull',                30.0, 5.0, array[15, 15, 15])
  ) as p(workout, days_ago, position, exercise, base, step, reps)
  cross join generate_series(0, 3) as week
  cross join lateral generate_subscripts(p.reps, 1) as s(i);

  -- Three planned gym sessions in the coming week, at 6 p.m. local time.
  insert into public.gym_sessions (id, user_id, title, starts_at, ends_at, source)
  select
    md5('cumulusfit-demo-gym-' || uid || d)::uuid,
    uid,
    'Gym session',
    ((current_date + d) + time '18:00') at time zone demo_timezone,
    ((current_date + d) + time '19:00') at time zone demo_timezone,
    case when d = 3 then 'manual' else 'ai' end
  from unnest(array[1, 3, 5]) as d;

  raise notice 'Demo data added for %', demo_email;
end $$;

-- To remove the demo data later, set the email and run just this block:
--
-- do $$
-- declare uid uuid := (select id from auth.users where email = 'you@example.com');
-- begin
--   delete from public.set_logs where user_id = uid and session_id in (
--     select md5('cumulusfit-demo-' || uid || w || '-' || week)::uuid
--     from unnest(array['push', 'legs', 'pull']) as w, generate_series(0, 3) as week);
--   delete from public.gym_sessions where user_id = uid and id in (
--     select md5('cumulusfit-demo-gym-' || uid || d)::uuid from generate_series(1, 7) as d);
--   delete from public.routines where id = md5('cumulusfit-demo-routine-' || uid)::uuid;
-- end $$;
