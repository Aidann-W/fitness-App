import type { Metadata } from 'next';
import TrainingView from '../../dashboard/TrainingView';
export const metadata: Metadata = { title: 'Training | CumulusFit' };
export default function Page() { return <TrainingView />; }
