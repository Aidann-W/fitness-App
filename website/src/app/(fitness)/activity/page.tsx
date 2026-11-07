import type { Metadata } from 'next';
import ActivityView from '../../dashboard/ActivityView';
export const metadata: Metadata = { title: 'Activity | CumulusFit' };
export default function Page() { return <ActivityView />; }
