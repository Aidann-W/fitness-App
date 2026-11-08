import type { RoutineAnswers } from './types';

// Both commas and new lines are accepted; repeated names keep their first spelling.
export function customItems(text: string): string[] {
  return uniqueItems(text.split(/[,\n]/).map(item => item.trim()).filter(Boolean));
}
function uniqueItems(items: string[]): string[] {
  return items.filter((item, index) => items.findIndex(other => other.toLowerCase() === item.toLowerCase()) === index);
}
export function customizeRoutineAnswers(answers: RoutineAnswers, equipment: string, exercises: string): RoutineAnswers {
  return { ...answers, equipment: uniqueItems([...answers.equipment, ...customItems(equipment)]), preferredExercises: customItems(exercises) };
}
