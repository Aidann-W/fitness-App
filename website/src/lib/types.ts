export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes?: string;
}

export interface WorkoutRoutine {
  id?: string;
  title: string;
  description: string;
  exercises: Exercise[];
  created_at?: string;
}

export interface RoutineAnswers {
  goal: string;
  experience: string;
  equipment: string[];
  minutes: number;
  focus: string;
  preferredExercises?: string[];
}

export interface SetEntry {
  reps: string;
  weight: string;
  done: boolean;
  // Completed on this device but not yet stored in Supabase.
  unsaved: boolean;
}

// Kept in localStorage, so a workout survives a refresh or a Wi-Fi drop.
export interface ActiveSession {
  sessionId: string;
  routineId: string | null;
  routine: WorkoutRoutine;
  sets: Record<string, SetEntry>;
  restEndsAt: number | null;
  startedAt?: number | null;
}

export interface SetLog {
  session_id: string;
  routine_id: string | null;
  exercise_name: string;
  set_index: number;
  reps: number;
  weight: number;
  unit: 'lb' | 'kg';
}

export interface LoggedSet extends SetLog {
  completed_at: string;
}
