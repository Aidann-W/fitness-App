import type { Metadata } from 'next';
import ScheduleSection from '../../dashboard/ScheduleSection';
import { PageHeading } from '../../dashboard/PageHeading';
export const metadata: Metadata = { title: 'Schedule | CumulusFit' };
export default function SchedulePage() { return <><PageHeading eyebrow="PLAN YOUR WEEK" title="Schedule" description="Find time to train around your calendar."/><ScheduleSection /></>; }
