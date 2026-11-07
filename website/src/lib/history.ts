import type { LoggedSet } from './types';

export interface WorkoutSummary {
  sessionId: string;
  date: string;
  setCount: number;
  exercises: string[];
}

// The sets from the most recent workout that included each exercise.
// Expects logs newest first. The current workout is excluded so it can't
// count as "last time".
export function lastSetsByExercise(logs: LoggedSet[], currentSessionId?: string) {
  const latestSession = new Map<string, string>();
  const sets: Record<string, LoggedSet[]> = {};

  for (const log of logs) {
    if (log.session_id === currentSessionId) continue;

    if (!latestSession.has(log.exercise_name)) {
      latestSession.set(log.exercise_name, log.session_id);
    }
    if (latestSession.get(log.exercise_name) === log.session_id) {
      (sets[log.exercise_name] ??= []).push(log);
    }
  }

  for (const exerciseSets of Object.values(sets)) {
    exerciseSets.sort((a, b) => a.set_index - b.set_index);
  }
  return sets;
}

// One entry per workout, newest first. Expects logs newest first.
export function summarizeWorkouts(logs: LoggedSet[]): WorkoutSummary[] {
  const workouts = new Map<string, WorkoutSummary>();

  for (const log of logs) {
    const workout = workouts.get(log.session_id) ?? {
      sessionId: log.session_id,
      date: log.completed_at,
      setCount: 0,
      exercises: [],
    };
    workout.setCount += 1;
    if (!workout.exercises.includes(log.exercise_name)) {
      workout.exercises.push(log.exercise_name);
    }
    workouts.set(log.session_id, workout);
  }

  return [...workouts.values()];
}

export function formatSet(set: LoggedSet) {
  return set.weight > 0 ? `${set.weight} ${set.unit} × ${set.reps}` : `${set.reps} reps`;
}

const KG_TO_LB = 2.20462;

const inPounds = (set: LoggedSet) => (set.unit === 'kg' ? set.weight * KG_TO_LB : set.weight);

// The heaviest set, using reps to break ties.
const bestSet = (sets: LoggedSet[]) =>
  sets.reduce((best, set) =>
    set.weight > best.weight || (set.weight === best.weight && set.reps > best.reps) ? set : best
  );

export interface Target {
  weight: number;
  reps: number;
  note: string;
}

const WEIGHT_STEP_LB = 5;

// "8-12" -> [8, 12], "10" -> [10, 10]. Anything else (e.g. "AMRAP") -> null.
function repRange(reps: string): [number, number] | null {
  const numbers = reps.match(/\d+/g)?.map(Number);
  if (!numbers?.length) return null;
  return [Math.min(...numbers), Math.max(...numbers)];
}

// Double progression: add reps at the same weight until every working set
// reaches the top of the planned range, then add weight and drop back down.
export function nextTarget(lastSets: LoggedSet[] | undefined, plannedReps: string): Target | null {
  if (!lastSets?.length) return null;

  const top = bestSet(lastSets);
  const workingSets = lastSets.filter((set) => set.weight === top.weight);
  const fewestReps = Math.min(...workingSets.map((set) => set.reps));

  if (top.weight === 0) {
    return { weight: 0, reps: top.reps + 1, note: 'One more rep than last time.' };
  }

  const [low, high] = repRange(plannedReps) ?? [top.reps, top.reps];

  if (fewestReps >= high) {
    return {
      weight: top.weight + WEIGHT_STEP_LB,
      reps: low,
      note: `You hit ${high} reps on every set, so add ${WEIGHT_STEP_LB} lb.`,
    };
  }
  if (fewestReps >= low) {
    return { weight: top.weight, reps: fewestReps + 1, note: 'Same weight, one more rep.' };
  }
  return { weight: top.weight, reps: low, note: `Stay at ${top.weight} lb until you reach ${low} reps.` };
}

export const formatTarget = (target: Target) =>
  target.weight > 0 ? `${target.weight} lb × ${target.reps}` : `${target.reps} reps`;

export interface ProgressPoint {
  sessionId: string;
  date: string;
  weight: number;
  reps: number;
}

// Heaviest set of each workout for one exercise, oldest first.
export function progressFor(logs: LoggedSet[], exerciseName: string): ProgressPoint[] {
  const sessions = new Map<string, LoggedSet[]>();
  for (const log of logs) {
    if (log.exercise_name !== exerciseName) continue;
    sessions.set(log.session_id, [...(sessions.get(log.session_id) ?? []), log]);
  }

  return [...sessions.entries()]
    .map(([sessionId, sets]) => {
      const best = bestSet(sets);
      const date = sets.reduce((latest, set) => (set.completed_at > latest ? set.completed_at : latest), '');
      return { sessionId, date, weight: Math.round(inPounds(best) * 10) / 10, reps: best.reps };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Exercises with a weighted set logged. The one with the most workouts comes
// first because it draws the most useful chart; ties go to the heaviest lift,
// which is usually a main compound movement.
export function weightedExercises(logs: LoggedSet[]): string[] {
  const sessions = new Map<string, Set<string>>();
  const heaviest = new Map<string, number>();
  for (const log of logs) {
    if (log.weight <= 0) continue;
    sessions.set(log.exercise_name, (sessions.get(log.exercise_name) ?? new Set()).add(log.session_id));
    heaviest.set(log.exercise_name, Math.max(heaviest.get(log.exercise_name) ?? 0, inPounds(log)));
  }
  return [...sessions.keys()].sort(
    (a, b) => sessions.get(b)!.size - sessions.get(a)!.size || heaviest.get(b)! - heaviest.get(a)!
  );
}

// Total weight moved (weight × reps) since a date, in pounds.
export function poundsLiftedSince(logs: LoggedSet[], since: Date): number {
  return Math.round(
    logs
      .filter((log) => new Date(log.completed_at) >= since)
      .reduce((total, log) => total + inPounds(log) * log.reps, 0)
  );
}
