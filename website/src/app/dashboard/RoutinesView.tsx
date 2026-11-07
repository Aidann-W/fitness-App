'use client';
import { useWorkouts } from './WorkoutProvider';
import { starterPresets } from '@/lib/mockData';
import { PageHeading } from './PageHeading';
export default function RoutinesView() {
    const { loading, routines, selectedRoutine, openRoutine, buildRoutine, setShowIntake } = useWorkouts();
    const routineCards = loading ? [] : [...routines, ...starterPresets];
    return <><PageHeading eyebrow="WORKOUT LIBRARY" title="My routines" description="Your saved workouts and ready-to-use starting points."/>
 <div className="page-actions"><button className="button-primary" onClick={() => setShowIntake(true)}>Create with AI ✧</button><button className="button-secondary" onClick={buildRoutine}>Build my own</button></div>
 {loading ? <p className="empty-card" role="status">Loading routines…</p> : <div id="routines" className="scroll-mt-6">
                <p className="eyebrow mb-2">READY WHEN YOU ARE</p><h2 className="mb-4 text-lg font-semibold text-slate-900">Your routines</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {routineCards.map((item, idx) => {
                const selected = (selectedRoutine?.id ?? selectedRoutine?.title) === (item.id ?? item.title);
                return (<button key={item.id || idx} type="button" onClick={() => openRoutine(item)} aria-pressed={selected} className={`routine-card rounded-[24px] border bg-white p-5 text-left ${selected ? "border-[#3d6d8c]" : "border-[#d5e0e8] hover:border-[#b7c9d6]"}`}>
                        <span className="routine-symbol" aria-hidden="true">{idx % 2 === 0 ? "↗" : "◎"}</span><span className="mt-4 block font-semibold text-slate-900">{item.title}</span>
                        <span className="mt-1 block line-clamp-2 text-sm text-slate-500">{item.description}</span><span className="routine-meta">{item.exercises.length} exercises <span>{selected ? "Selected · Open" : "Open routine"} ↗</span></span>
                      </button>);
            })}
                </div>
              </div>}
 </>;
}
