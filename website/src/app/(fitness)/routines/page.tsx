import type { Metadata } from 'next';
import RoutinesView from '../../dashboard/RoutinesView';
export const metadata: Metadata = { title: 'My routines | CumulusFit' };
export default function Page() { return <RoutinesView />; }
