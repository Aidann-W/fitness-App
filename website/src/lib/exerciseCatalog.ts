// Built-in exercise list for the routine editor's autocomplete. Kept local, not
// fetched from an API, so it is instant and works on bad gym Wi-Fi.

export const MUSCLES = [
  'Chest',
  'Shoulders',
  'Triceps',
  'Back',
  'Rear Delts',
  'Biceps',
  'Forearms',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Core',
] as const;

export type Muscle = (typeof MUSCLES)[number];

export const CATEGORIES = ['Upper body', 'Lower body', 'Push', 'Pull', 'Legs', 'Core'] as const;

export type Category = (typeof CATEGORIES)[number];

const PUSH: Muscle[] = ['Chest', 'Shoulders', 'Triceps'];
const PULL: Muscle[] = ['Back', 'Rear Delts', 'Biceps', 'Forearms'];
const LEGS: Muscle[] = ['Quads', 'Hamstrings', 'Glutes', 'Calves'];

const CATEGORY_MUSCLES: Record<Category, Muscle[]> = {
  'Upper body': [...PUSH, ...PULL],
  'Lower body': LEGS,
  Push: PUSH,
  Pull: PULL,
  Legs: LEGS,
  Core: ['Core'],
};

export interface CatalogExercise {
  name: string;
  muscle: Muscle;
  equipment: string;
}

// [name, equipment], grouped by the main muscle worked.
const EXERCISES: Record<Muscle, [string, string][]> = {
  Chest: [
    ['Barbell Bench Press', 'Barbell'],
    ['Incline Barbell Bench Press', 'Barbell'],
    ['Decline Barbell Bench Press', 'Barbell'],
    ['Dumbbell Bench Press', 'Dumbbells'],
    ['Incline Dumbbell Press', 'Dumbbells'],
    ['Dumbbell Floor Press', 'Dumbbells'],
    ['Dumbbell Fly', 'Dumbbells'],
    ['Cable Fly', 'Cable'],
    ['Low-to-High Cable Fly', 'Cable'],
    ['Machine Chest Press', 'Machine'],
    ['Pec Deck', 'Machine'],
    ['Smith Machine Bench Press', 'Machine'],
    ['Push-Up', 'Bodyweight'],
    ['Incline Push-Up', 'Bodyweight'],
    ['Chest Dip', 'Bodyweight'],
  ],
  Shoulders: [
    ['Overhead Press', 'Barbell'],
    ['Push Press', 'Barbell'],
    ['Landmine Press', 'Barbell'],
    ['Seated Dumbbell Shoulder Press', 'Dumbbells'],
    ['Arnold Press', 'Dumbbells'],
    ['Dumbbell Lateral Raise', 'Dumbbells'],
    ['Dumbbell Front Raise', 'Dumbbells'],
    ['Cable Lateral Raise', 'Cable'],
    ['Machine Shoulder Press', 'Machine'],
    ['Upright Row', 'Barbell'],
    ['Kettlebell Overhead Press', 'Kettlebell'],
    ['Pike Push-Up', 'Bodyweight'],
  ],
  Triceps: [
    ['Tricep Rope Pushdown', 'Cable'],
    ['Straight Bar Pushdown', 'Cable'],
    ['Overhead Cable Tricep Extension', 'Cable'],
    ['Dumbbell Overhead Tricep Extension', 'Dumbbells'],
    ['Dumbbell Tricep Kickback', 'Dumbbells'],
    ['Skull Crusher', 'Barbell'],
    ['Close-Grip Bench Press', 'Barbell'],
    ['Tricep Dip', 'Bodyweight'],
    ['Bench Dip', 'Bodyweight'],
    ['Diamond Push-Up', 'Bodyweight'],
  ],
  Back: [
    ['Deadlift', 'Barbell'],
    ['Pull-Up', 'Pull-up bar'],
    ['Chin-Up', 'Pull-up bar'],
    ['Lat Pulldown', 'Cable'],
    ['Close-Grip Lat Pulldown', 'Cable'],
    ['Straight-Arm Pulldown', 'Cable'],
    ['Seated Cable Row', 'Cable'],
    ['Barbell Row', 'Barbell'],
    ['Pendlay Row', 'Barbell'],
    ['T-Bar Row', 'Barbell'],
    ['Rack Pull', 'Barbell'],
    ['Single-Arm Dumbbell Row', 'Dumbbells'],
    ['Chest-Supported Dumbbell Row', 'Dumbbells'],
    ['Machine Row', 'Machine'],
    ['Inverted Row', 'Bodyweight'],
    ['Back Extension', 'Bodyweight'],
    ['Barbell Shrug', 'Barbell'],
    ['Dumbbell Shrug', 'Dumbbells'],
  ],
  'Rear Delts': [
    ['Face Pull', 'Cable'],
    ['Cable Rear Delt Fly', 'Cable'],
    ['Reverse Pec Deck', 'Machine'],
    ['Rear Delt Dumbbell Fly', 'Dumbbells'],
    ['Band Pull-Apart', 'Bands'],
  ],
  Biceps: [
    ['Barbell Curl', 'Barbell'],
    ['EZ-Bar Curl', 'Barbell'],
    ['Preacher Curl', 'Barbell'],
    ['Dumbbell Curl', 'Dumbbells'],
    ['Hammer Curl', 'Dumbbells'],
    ['Incline Dumbbell Curl', 'Dumbbells'],
    ['Concentration Curl', 'Dumbbells'],
    ['Spider Curl', 'Dumbbells'],
    ['Cable Curl', 'Cable'],
    ['Bayesian Cable Curl', 'Cable'],
  ],
  Forearms: [
    ['Wrist Curl', 'Dumbbells'],
    ['Reverse Curl', 'Barbell'],
    ["Farmer's Carry", 'Dumbbells'],
    ['Dead Hang', 'Pull-up bar'],
  ],
  Quads: [
    ['Barbell Back Squat', 'Squat rack'],
    ['Front Squat', 'Squat rack'],
    ['Smith Machine Squat', 'Machine'],
    ['Hack Squat', 'Machine'],
    ['Leg Press', 'Leg press'],
    ['Leg Extension', 'Machine'],
    ['Trap Bar Deadlift', 'Barbell'],
    ['Goblet Squat', 'Dumbbells'],
    ['Heel-Elevated Goblet Squat', 'Dumbbells'],
    ['Bulgarian Split Squat', 'Dumbbells'],
    ['Walking Lunge', 'Dumbbells'],
    ['Reverse Lunge', 'Dumbbells'],
    ['Step-Up', 'Dumbbells'],
    ['Bodyweight Squat', 'Bodyweight'],
    ['Jump Squat', 'Bodyweight'],
    ['Box Jump', 'Bodyweight'],
    ['Pistol Squat', 'Bodyweight'],
  ],
  Hamstrings: [
    ['Romanian Deadlift', 'Barbell'],
    ['Stiff-Leg Deadlift', 'Barbell'],
    ['Good Morning', 'Barbell'],
    ['Dumbbell Romanian Deadlift', 'Dumbbells'],
    ['Single-Leg Romanian Deadlift', 'Dumbbells'],
    ['Lying Leg Curl', 'Machine'],
    ['Seated Leg Curl', 'Machine'],
    ['Glute-Ham Raise', 'Machine'],
    ['Nordic Hamstring Curl', 'Bodyweight'],
    ['Kettlebell Swing', 'Kettlebell'],
  ],
  Glutes: [
    ['Barbell Hip Thrust', 'Barbell'],
    ['Sumo Deadlift', 'Barbell'],
    ['Glute Bridge', 'Bodyweight'],
    ['Single-Leg Glute Bridge', 'Bodyweight'],
    ['Frog Pump', 'Bodyweight'],
    ['Cable Glute Kickback', 'Cable'],
    ['Cable Pull-Through', 'Cable'],
    ['Hip Abduction Machine', 'Machine'],
    ['Curtsy Lunge', 'Dumbbells'],
    ['Lateral Band Walk', 'Bands'],
  ],
  Calves: [
    ['Standing Calf Raise', 'Machine'],
    ['Seated Calf Raise', 'Machine'],
    ['Smith Machine Calf Raise', 'Machine'],
    ['Leg Press Calf Raise', 'Leg press'],
    ['Single-Leg Calf Raise', 'Bodyweight'],
    ['Tibialis Raise', 'Bodyweight'],
  ],
  Core: [
    ['Plank', 'Bodyweight'],
    ['Side Plank', 'Bodyweight'],
    ['Dead Bug', 'Bodyweight'],
    ['Bird Dog', 'Bodyweight'],
    ['Hollow Body Hold', 'Bodyweight'],
    ['Bicycle Crunch', 'Bodyweight'],
    ['Mountain Climber', 'Bodyweight'],
    ['Russian Twist', 'Bodyweight'],
    ['Decline Sit-Up', 'Bench'],
    ['Hanging Leg Raise', 'Pull-up bar'],
    ['Hanging Knee Raise', 'Pull-up bar'],
    ['Cable Crunch', 'Cable'],
    ['Pallof Press', 'Cable'],
    ['Cable Woodchopper', 'Cable'],
    ['Ab Wheel Rollout', 'Ab wheel'],
    ['Suitcase Carry', 'Dumbbells'],
  ],
};

export const EXERCISE_CATALOG: CatalogExercise[] = MUSCLES.flatMap((muscle) =>
  EXERCISES[muscle].map(([name, equipment]) => ({ name, muscle, equipment }))
);

// filter is 'all', 'category:<Category>' or 'muscle:<Muscle>'.
export function filterExercises(query: string, filter: string): CatalogExercise[] {
  const [kind, value] = filter.split(':');
  const muscles =
    kind === 'category' ? CATEGORY_MUSCLES[value as Category] : kind === 'muscle' ? [value as Muscle] : null;

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = EXERCISE_CATALOG.filter(
    (exercise) =>
      (!muscles || muscles.includes(exercise.muscle)) &&
      words.every((word) =>
        `${exercise.name} ${exercise.muscle} ${exercise.equipment}`.toLowerCase().includes(word)
      )
  );

  // Names that start with what was typed come first.
  const start = query.trim().toLowerCase();
  if (!start) return matches;
  return [
    ...matches.filter((exercise) => exercise.name.toLowerCase().startsWith(start)),
    ...matches.filter((exercise) => !exercise.name.toLowerCase().startsWith(start)),
  ];
}
