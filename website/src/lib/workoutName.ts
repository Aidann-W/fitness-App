export function friendlyWorkoutName(title: string): string {
  const cleaned = title.replace(/\bhypertrophy\b/gi, '').replace(/\b(beginner|intermediate|advanced)\b/gi, '').replace(/\s+/g, ' ').replace(/^[\s:–—-]+|[\s:–—-]+$/g, '').trim();
  return cleaned || 'Full Body Workout';
}
