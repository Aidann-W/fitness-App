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
