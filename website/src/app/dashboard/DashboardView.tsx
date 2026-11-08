'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWorkouts } from './WorkoutProvider';
import { summarizeWorkouts } from '@/lib/history';
import { activityLogs, activityStart, liftedVolume } from '@/lib/activity';
import { cloudLayer } from '@/lib/altitude';
import './SimpleDashboard.css';
import ConsistencyCard from './ConsistencyCard';
import CloudLiftCard from './CloudLiftCard';

export default function DashboardView() {
  const { selectedRoutine, session, logs, loading, setShowIntake } = useWorkouts();
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => setToday(new Date()), []);
  const routine = session?.routine ?? selectedRoutine;
  const recentLogs = today ? activityLogs(logs, activityStart(today, 7), today) : [];
  const recentSessions = summarizeWorkouts(recentLogs).length;
  const volume = liftedVolume(recentLogs);
  const layer = cloudLayer(volume);
  const ready = !loading && today !== null;
  return <div className="simple-dashboard">
    <div className="simple-heading"><div><p className="eyebrow">HOME / DASHBOARD</p><h1>Workouts</h1></div><button className="dashboard-add" onClick={() => setShowIntake(true)}>Generate a workout</button></div>
    <div className="simple-grid">
      <Link href="/training" className="simple-tile workout-tile"><div className="workout-tile-top"><span className="workout-round" aria-hidden="true">{routine?.exercises.length ?? '—'}</span><span className="tile-kicker">{session ? 'IN PROGRESS' : 'NEXT WORKOUT'}</span></div><h2>{routine?.title ?? (loading ? 'Loading…' : 'Your first workout')}</h2><p>{session ? 'Continue your session' : routine ? routine.exercises.length+' exercises · Open workout' : 'Choose a routine to get started'}</p></Link>
      <Link href="/activity" className="simple-tile sessions-tile"><p className="tile-kicker">LAST 7 DAYS</p><strong className="tile-number">{ready ? recentSessions : '—'}<small>sessions</small></strong><div><h2>Training activity</h2><p>{ready ? recentLogs.length+' sets logged' : 'Loading activity…'}</p></div></Link>
      <ConsistencyCard logs={logs} loading={loading} />
      <div className="simple-tile quick-tile"><h2>Make it your own</h2><button onClick={()=>setShowIntake(true)}><span aria-hidden="true">+</span> New workout</button><Link href="/routines">My routines</Link><Link href="/schedule">Plan a session</Link></div>
      <CloudLiftCard className="dashboard-cloud-card" pounds={volume} loading={!ready} />
      <Link href="/activity" className="simple-tile volume-tile"><div><h2>Volume lifted</h2><p>Last 7 days</p></div><strong>{ready ? volume.toLocaleString() : '—'} <small>lb</small></strong><span className="cloud-level">{ready ? (volume > 0 ? layer.name+' level' : 'Your climb starts here') : 'Loading progress…'}</span></Link>
    </div>
  </div>;
}
