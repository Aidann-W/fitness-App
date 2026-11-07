'use client';
import Link from 'next/link';
import { useWorkouts } from './WorkoutProvider';
import { PageHeading } from './PageHeading';
import { summarizeWorkouts } from '@/lib/history';
export default function DashboardView() {
    const { selectedRoutine, session, routines, logs, loading, setShowIntake } = useWorkouts();
    const workouts = summarizeWorkouts(logs);
    return <>
 <PageHeading eyebrow="YOUR OVERVIEW" title="Dashboard" description="Your next workout and a quick look at your progress."/>
 <section className="dashboard-overview">
  <article className="session-hero dashboard-workout"><div className="hero-clouds" aria-hidden="true"/><div className="relative z-[1] p-6 sm:p-8"><p className="hero-label"><span className="live-dot"/>{session ? 'READY TO RESUME' : 'YOUR NEXT WORKOUT'}</p><h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900">{session?.routine.title ?? selectedRoutine?.title ?? (loading ? 'Loading your workout…' : 'Ready for your first workout?')}</h2><p className="mt-3 max-w-md text-sm leading-6 text-slate-600">{session ? 'Your completed sets are kept while you browse.' : selectedRoutine?.description ?? 'Create a workout or choose one from your routine library.'}</p><div className="mt-8 flex flex-wrap gap-3"><Link className="button-primary" href="/training">{session ? 'Resume workout' : 'Open training'} <span aria-hidden="true">↗</span></Link>{!session && <button className="button-secondary" onClick={() => setShowIntake(true)}>Create with AI ✧</button>}</div></div></article>
  <div className="overview-stats" aria-label="Workout totals"><div className="stat-card"><span>Logged sessions</span><strong>{loading ? '—' : workouts.length}</strong><small>Sessions with completed sets</small></div><div className="stat-card"><span>Completed sets</span><strong>{loading ? '—' : logs.length}</strong><small>Across your workout history</small></div><div className="stat-card"><span>Saved routines</span><strong>{loading ? '—' : routines.length}</strong><small>Your personal workout library</small></div></div>
 </section>
 <section aria-labelledby="explore-title"><div className="mb-4"><p className="eyebrow">KEEP MOVING</p><h2 id="explore-title" className="mt-2 text-lg font-semibold text-slate-900">Everything in its place</h2></div><div className="destination-grid">
 {[
            ['/routines', '01', 'My routines', 'Choose a saved workout or build a new one.'],
            ['/activity', '02', 'Activity', 'See your lifting progress and past sessions.'],
            ['/schedule', '03', 'Schedule', 'Fit gym sessions around your calendar.'],
        ].map(([href, number, title, description]) => <Link key={href} href={href} className="destination-card"><span className="eyebrow">{number}</span><span className="destination-arrow" aria-hidden="true">↗</span><h3>{title}</h3><p>{description}</p></Link>)}
 </div></section>
 </>;
}
