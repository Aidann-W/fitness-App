import { supabase } from './supabase';
import type { RoutineAnswers, WorkoutRoutine } from './types';

async function loadAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session.access_token;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.session) {
    throw error ?? new Error('Could not start a session');
  }
  return data.session.access_token;
}

// Shared while in flight so parallel callers don't create two anonymous users.
let pendingToken: Promise<string> | null = null;

function getAccessToken() {
  pendingToken ??= loadAccessToken().finally(() => {
    pendingToken = null;
  });
  return pendingToken;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? 'Request failed');
  return body;
}

export function fetchRoutines() {
  return request<WorkoutRoutine[]>('/api/routines');
}

export function saveRoutine(routine: WorkoutRoutine) {
  return request<WorkoutRoutine>('/api/routines', {
    method: 'POST',
    body: JSON.stringify(routine),
  });
}

export function generateRoutine(answers: RoutineAnswers) {
  return request<WorkoutRoutine>('/api/generate-routine', {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });
}
