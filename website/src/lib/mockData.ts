import { WorkoutRoutine } from './types';

export const starterPresets: WorkoutRoutine[] = [
  {
    id: 'ppl-push-1',
    title: 'Hypertrophy Push Day',
    description: 'Chest, shoulders, and triceps focus with heavy compound presses.',
    exercises: [
      { name: 'Barbell Bench Press', sets: 4, reps: '6-8', rest_seconds: 180, notes: 'Explosive drive' },
      { name: 'Incline Dumbbell Press', sets: 3, reps: '8-10', rest_seconds: 120, notes: 'Control 3-sec eccentric' },
      { name: 'Standing Overhead Press', sets: 3, reps: '8-10', rest_seconds: 120 },
      { name: 'Cable Lateral Raises', sets: 4, reps: '12-15', rest_seconds: 60 },
      { name: 'Tricep Rope Pushdowns', sets: 3, reps: '10-12', rest_seconds: 60 }
    ]
  },
  {
    id: 'vert-power-1',
    title: 'Vertical Jump & Leg Power',
    description: 'Explosive lower body power combined with patellar tendon durability.',
    exercises: [
      { name: 'Trap Bar Deadlift', sets: 4, reps: '3-5', rest_seconds: 180, notes: 'Max intent velocity' },
      { name: 'Depth Jumps', sets: 3, reps: '5', rest_seconds: 120, notes: 'Minimize ground contact time' },
      { name: 'Bulgarian Split Squats', sets: 3, reps: '8', rest_seconds: 90 },
      { name: 'Tibialis Raises', sets: 3, reps: '15-20', rest_seconds: 45 }
    ]
  }
];
