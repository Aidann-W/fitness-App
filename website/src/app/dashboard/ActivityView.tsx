'use client';
import { useEffect, useState } from 'react';
import type { LoggedSet } from '@/lib/types';
import { useWorkouts } from './WorkoutProvider';
import ProgressPanel from './ProgressPanel';
import { summarizeWorkouts } from '@/lib/history';
import { activityDayKey, activityLogs, activityStart, liftedVolume } from '@/lib/activity';
import WorkoutWeek from './WorkoutWeek';
import WorkoutHistory from './WorkoutHistory';
import VolumeChart from './VolumeChart';
import CloudLiftCard from './CloudLiftCard';
import { PageHeading } from './PageHeading';
import './ActivityView.css';

const PERIODS = [{ days: 7, label: 'Week' }, { days: 30, label: 'Month' }, { days: 90, label: '3 months' }, { days: 365, label: 'Year' }];
export default function ActivityView() {
  const { logs, loading } = useWorkouts();
  return <ProgressView logs={logs} loading={loading} />;
}

export function ProgressView({ logs, loading }: { logs: LoggedSet[]; loading: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  const [days, setDays] = useState(7);
  const [historyRange, setHistoryRange] = useState('7');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [animateCloud, setAnimateCloud] = useState(true);
  useEffect(() => setNow(new Date()), []);
  const ready = !loading && now !== null;
  const rangedLogs = now ? activityLogs(logs, activityStart(now, days), now) : [];
  const historyLogs = now ? selectedDate ? activityLogs(logs, new Date(0), now).filter(log => activityDayKey(new Date(log.completed_at)) === selectedDate) : activityLogs(logs, historyRange === 'all' ? new Date(0) : activityStart(now, Number(historyRange)), now) : [];
  const periodLabel = 'Last ' + days + ' days';
  const history = <WorkoutHistory logs={historyLogs} range={historyRange} selectedDate={selectedDate} onClear={() => setSelectedDate(null)} onRange={value => { setHistoryRange(value); setSelectedDate(null); }} />;
  return <div className="progress-page"><PageHeading eyebrow="HOME / PROGRESS" title="Your progress" />
    <div className="progress-periods" role="group" aria-label="Progress chart range">{PERIODS.map(period => <button key={period.days} aria-pressed={days === period.days} onClick={event => { setAnimateCloud(event.detail !== 0); setDays(period.days); }}>{period.label}</button>)}</div>
    <WorkoutWeek logs={logs} selectedDate={selectedDate} onSelect={setSelectedDate} />
    {!ready ? <p className="empty-card" role="status">Loading progress…</p> : <div id="activity">
      {selectedDate && history}
      <div className="progress-page-grid">
        <VolumeChart logs={rangedLogs} now={now!} days={days} label={periodLabel} />
        <CloudLiftCard pounds={liftedVolume(rangedLogs)} period={periodLabel} animate={animateCloud} />
        <ProgressPanel logs={rangedLogs} />
        <section className="progress-insights" aria-label={periodLabel + ' summary'}><div className="progress-card"><span>Workouts</span><strong>{summarizeWorkouts(rangedLogs).length}</strong><small>Sessions with logged sets</small></div><div className="progress-card"><span>Sets logged</span><strong>{rangedLogs.length}</strong><small>Every working set counts</small></div><div className="progress-card"><span>Training days</span><strong>{new Set(rangedLogs.map(log => activityDayKey(new Date(log.completed_at)))).size}</strong><small>{periodLabel}</small></div></section>
      </div>
      {!selectedDate && history}
    </div>}
  </div>;
}
