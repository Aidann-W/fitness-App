import type { WorkoutRoutine } from './types';

export type RoutineFocus = 'legs' | 'arms' | 'chest' | 'back' | 'shoulders' | 'full-body';
const patterns: [RoutineFocus, RegExp][] = [
  ['legs', /\b(leg|legs|lower body|quad|quads|glute|glutes|hamstring|hamstrings|calf|calves|squat|squats|lunge|lunges|deadlift|jumps?)\b/i],
  ['arms', /\b(arm|arms|bicep|biceps|tricep|triceps|curl|curls|pushdowns?)\b/i],
  ['chest', /\b(chest|push|bench|pecs?|fly|flyes|push-ups?)\b/i],
  ['back', /\b(back|pull|rows?|pulldowns?|pull-ups?|chin-ups?)\b/i],
  ['shoulders', /\b(shoulders?|delts?|overhead|lateral raises?)\b/i],
];

export function routineFocus(routine: WorkoutRoutine): RoutineFocus {
  if (/\b(full body|total body|upper body)\b/i.test(routine.title)) return 'full-body';
  const titleMatches = patterns.filter(([, pattern]) => pattern.test(routine.title));
  if (titleMatches.length === 1) return titleMatches[0][0];
  if (titleMatches.length > 1) return 'full-body';
  const scores = patterns.map(([focus, pattern]) => ({ focus, count: routine.exercises.filter(exercise => pattern.test(exercise.name)).length }));
  const top = Math.max(...scores.map(score => score.count));
  const winners = scores.filter(score => score.count === top);
  return top > 0 && winners.length === 1 ? winners[0].focus : 'full-body';
}
