import type { ReactNode } from 'react';
import type { WorkoutRoutine } from '@/lib/types';
import { routineFocus, type RoutineFocus } from '@/lib/routineFocus';

const labels: Record<RoutineFocus, string> = { legs: 'Lower body', arms: 'Arms', chest: 'Chest', back: 'Back', shoulders: 'Shoulders', 'full-body': 'Full body' };
const paths: Record<RoutineFocus, ReactNode> = {
  legs: <><path d="M8 3h8l1 7-2 5-1 6h-3l1-7-1-4-1 5-2 6H5l3-9Z"/><path d="M8 6h8M11 10l2-3"/></>,
  arms: <><path d="m5 14-1-5 3-5 4 1v3H8l1 4c3-3 6-3 9-1 3 3 2 7-1 9H9l-4-6Z"/><path d="M9 12c-1 2-1 3 0 5m2-4c2-2 4-2 6 0"/></>,
  chest: <><path d="m8 3-2 3-3 2 2 6 2-1 1 8h8l1-8 2 1 2-6-3-2-2-3M8 3c1 3 7 3 8 0"/><path d="M12 7v7m0-5c-2-2-4-2-6 0m6 0c2-2 4-2 6 0M7 12l5 2 5-2"/></>,
  back: <><path d="m8 3-2 3-3 2 2 6 2-1 1 8h8l1-8 2 1 2-6-3-2-2-3M8 3l4 3 4-3"/><path d="M12 6v14M8 8l2 3-2 4m8-7-2 3 2 4"/></>,
  shoulders: <><path d="M9 3v3L5 7l-2 4 1 5 3-1 1 6h8l1-6 3 1 1-5-2-4-4-1V3"/><path d="M5 7c3 0 4 3 2 5m12-5c-3 0-4 3-2 5M9 6h6"/></>,
  'full-body': <><circle cx="12" cy="4" r="2"/><path d="M8 9h8m-4-2v7m-4-5-4 4m12-4 4 4m-8 1-4 7m4-7 4 7"/></>,
};
export default function RoutineIcon({ routine }: { routine: WorkoutRoutine }) {
  const focus = routineFocus(routine);
  return <span className="routine-symbol" role="img" aria-label={labels[focus]} title={labels[focus]}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[focus]}</svg></span>;
}
