import type { Metadata } from 'next';
import RoutineEditorView from '../../../dashboard/RoutineEditorView';
export const metadata: Metadata = { title: 'Edit routine | CumulusFit' };
export default function Page() { return <RoutineEditorView />; }
