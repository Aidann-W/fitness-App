import type { Metadata } from 'next';
import DashboardView from '../../dashboard/DashboardView';
export const metadata: Metadata = { title: 'Dashboard | CumulusFit' };
export default function Page() { return <DashboardView />; }
