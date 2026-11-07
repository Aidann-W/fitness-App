'use client';
import { useWorkouts } from './WorkoutProvider';
import ProgressPanel from './ProgressPanel';
import { summarizeWorkouts } from '@/lib/history';
import { PageHeading } from './PageHeading';
export default function ActivityView() {
    const { logs, loading } = useWorkouts();
    const workouts = summarizeWorkouts(logs);
    return <><PageHeading eyebrow="YOUR PROGRESS" title="Activity" description="Review your logged sets, workout history, and lifting progress."/>
 {loading ? <p className="empty-card" role="status">Loading activity…</p> : <div id="activity" className="scroll-mt-6">
                <p className="eyebrow mb-2">EVERY SET ADDS UP</p><h2 className="mb-4 text-lg font-semibold text-slate-900">Recent activity</h2>
                <ProgressPanel logs={logs}/>
                {workouts.length === 0 ? (<div className="rounded-[24px] border border-dashed border-[#b7c9d6] bg-white/70 p-6 text-sm leading-6 text-slate-600">
                    No logged sets yet. Complete your first workout to see your history and progress.
                  </div>) : (<div className="space-y-3">
                    {workouts.map((workout) => (<div key={workout.sessionId} className="rounded-[24px] border border-[#d5e0e8] bg-white p-4">
                        <p className="text-sm font-semibold text-slate-900">
                          {new Date(workout.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          {" · "}
                          {workout.setCount} set(s)
                        </p>
                        <p className="mt-1 text-sm text-slate-500">{workout.exercises.join(", ")}</p>
                      </div>))}
                  </div>)}
              </div>}
 </>;
}
