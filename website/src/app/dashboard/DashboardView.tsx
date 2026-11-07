'use client';
import Link from 'next/link';
import { useWorkouts } from './WorkoutProvider';
import { PageHeading } from './PageHeading';
import { summarizeWorkouts } from '@/lib/history';
import ProgressPanel from './ProgressPanel';
import WorkoutWeek from './WorkoutWeek';
export default function DashboardView() {
 const { selectedRoutine, session, routines, logs, loading, setShowIntake } = useWorkouts();
 const workouts = summarizeWorkouts(logs);
 const routine = session?.routine ?? selectedRoutine;
 return <>
 <PageHeading eyebrow="HOME / DASHBOARD" title="Your training, at a glance." description="Pick up where you left off." />
 <WorkoutWeek logs={logs} />
 <div className="dashboard-workspace">
 <div className="dashboard-main">
 <article className="next-workout panel"><div className="hero-clouds" aria-hidden="true"/><div className="next-workout-content"><p className="eyebrow">{session ? 'IN PROGRESS' : 'NEXT WORKOUT'}</p><h2>{routine?.title ?? (loading ? 'Loading your workout…' : 'Let’s get started')}</h2><p>{routine?.description || 'Choose a routine or put together a new workout.'}</p><div className="workout-facts"><span>{routine?.exercises.length ?? 0} exercises</span><span>{routine?.exercises.reduce((n,e)=>n+e.sets,0) ?? 0} working sets</span></div><div className="page-actions"><Link className="button-primary" href="/training">{session ? 'Continue workout' : 'Open workout'}</Link>{!session && <button className="button-secondary" onClick={()=>setShowIntake(true)}>New workout</button>}</div></div></article>
 <section aria-label="Your progress"><div className="section-title"><h2>Your progress</h2><Link href="/activity">View activity</Link></div>{loading ? <p className="empty-card">Loading progress…</p> : <ProgressPanel logs={logs}/>}</section>
 </div>
 <aside className="dashboard-aside">
 <section className="panel summary-panel"><h2>Training totals</h2><dl><div><dt>Logged sessions</dt><dd>{loading ? '—' : workouts.length}</dd></div><div><dt>Completed sets</dt><dd>{loading ? '—' : logs.length}</dd></div><div><dt>Saved routines</dt><dd>{loading ? '—' : routines.length}</dd></div></dl></section>
 <section className="panel recent-panel"><div className="section-title"><h2>Recent sessions</h2><Link href="/activity">View all</Link></div>{workouts.length ? workouts.slice(0,4).map(w=><div className="session-list-item" key={w.sessionId}><span className="session-dot"/><div><strong>{w.exercises[0]}</strong><p>{new Date(w.date).toLocaleDateString(undefined,{month:'short',day:'numeric'})} · {w.setCount} sets</p></div></div>) : <p className="quiet-empty">Your completed sessions will appear here after you log your first set.</p>}</section>
 <Link href="/schedule" className="panel schedule-shortcut"><span className="eyebrow">MAKE TIME FOR TRAINING</span><h2>Plan your week</h2><p>Find a time that works around your calendar.</p></Link>
 </aside></div>
 </>;
}
