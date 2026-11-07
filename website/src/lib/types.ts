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
}
