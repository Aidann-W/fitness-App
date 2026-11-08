import type { Metadata } from 'next';
import ScheduleSection from '../../dashboard/ScheduleSection';
import { PageHeading } from '../../dashboard/PageHeading';
export const metadata: Metadata = { title: 'Schedule | CumulusFit' };
export default function SchedulePage() { return <><PageHeading eyebrow="HOME / SCHEDULE" title="Schedule"/><ScheduleSection /></>; }
