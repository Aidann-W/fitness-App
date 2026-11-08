'use client';
import { useWorkouts, canStart, isStored, blankExercise } from './WorkoutProvider';
import ExercisePicker from './ExercisePicker';
import { TargetLine } from './WorkoutSession';
import { formatSet, nextTarget } from '@/lib/history';
import { PageHeading } from './PageHeading';
export default function RoutineEditorView() {
    const { selectedRoutine, loading, lastSets, editRoutine, buildRoutine, handleDeleteRoutine, setShowIntake, startWorkout, setSwapIndex, handleExerciseChange, removeExercise } = useWorkouts();
    return <><PageHeading eyebrow="MY ROUTINES" title="Edit routine" description="Adjust your workout, then start when you’re ready."/>
  <><section className="training-overview">
        <article className="session-hero training-routine"><div className="hero-clouds" aria-hidden="true"/><div className="relative z-[1]"><div className="flex flex-col justify-between gap-6 p-6 sm:p-8">
                    <div>
                      <p className="hero-label"><span className="live-dot"/> TODAY’S WORKOUT</p>
                      {selectedRoutine ? (<>
                          <textarea rows={1} aria-label="Routine name" value={selectedRoutine.title} onChange={(e) => editRoutine({ ...selectedRoutine, title: e.target.value })} className="hero-title mt-3 w-full bg-transparent text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl"/>
                          <textarea rows={1} aria-label="Routine description" placeholder="Add a short description" value={selectedRoutine.description} onChange={(e) => editRoutine({ ...selectedRoutine, description: e.target.value })} className="hero-description mt-2 w-full bg-transparent text-sm text-slate-600"/>
                        </>) : (<h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">
                          {loading ? "Loading today's session" : "No session yet"}
                        </h2>)}
                      <p className="mt-4 max-w-md text-sm leading-6 text-slate-500">Edit your routine below, then start when you’re ready.</p>
                    </div>
                    {selectedRoutine && (<div className="flex flex-wrap items-center gap-3">
                        <button onClick={() => startWorkout(selectedRoutine)} disabled={!canStart(selectedRoutine)} className="min-h-12 rounded-full bg-slate-900 px-6 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                          Start workout <span aria-hidden="true" className="ml-3">↗</span>
                        </button>
                        <span className="rounded-full bg-[#e7eef3] px-3 py-1 text-xs font-semibold text-[#3d6d8c]">
                          {selectedRoutine.exercises.length} exercises
                        </span>
                        {isStored(selectedRoutine) && (<button onClick={() => handleDeleteRoutine(selectedRoutine)} className="min-h-11 rounded-full px-3 text-sm text-slate-500 hover:text-red-700">
                            Delete
                          </button>)}
                      </div>)}
                    {selectedRoutine && !canStart(selectedRoutine) && (<p className="text-sm text-amber-800">Give every exercise a different name to start this workout.</p>)}
                  </div>
                </div>
              </article>

              <aside className="generate-card flex flex-col justify-between rounded-[28px] p-6 sm:p-7">
                <div>
                  <span className="ai-symbol" aria-hidden="true">✧</span><p className="generator-credit">Powered by Gemini</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Create a workout</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Tell us what you want to work on and how much time you have. We’ll put a session together.
                  </p>
                </div>
                <div className="mt-6 flex flex-col gap-3">
                  <button onClick={() => setShowIntake(true)} className="min-h-12 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800">
                    Create workout
                  </button>
                  <button onClick={buildRoutine} className="min-h-12 rounded-full border border-[#d5e0e8] bg-white px-5 text-sm font-medium text-slate-800 hover:border-[#b7c9d6]">
                    Or build my own
                  </button>
                </div>
              </aside>
            </section>

            <section className="exercise-section">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900">Exercise plan <span className="section-count">{selectedRoutine?.exercises.length ?? 0}</span></h2>

              </div>
              {loading ? (<div className="rounded-[28px] border border-[#d5e0e8] bg-white p-6 text-slate-500">Loading routines...</div>) : selectedRoutine ? (<div className="exercise-grid training-list">
                  {selectedRoutine.exercises.map((ex, i) => (<div key={i} className="exercise-card exercise-editor-card">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e7eef3] text-sm font-semibold text-[#3d6d8c]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <ExercisePicker label={`Exercise ${i + 1} name`} value={ex.name} onChange={(name) => handleExerciseChange(i, "name", name)} exclude={selectedRoutine.exercises.filter((_, j) => j !== i).map((other) => other.name)}/>
                        {ex.notes && <p className="text-xs text-slate-500">{ex.notes}</p>}
                        {lastSets[ex.name] && (<p className="text-xs text-[#3d6d8c]">Last time: {lastSets[ex.name].map(formatSet).join(", ")}</p>)}
                        <TargetLine target={nextTarget(lastSets[ex.name], ex.reps)}/>
                      </div>
                      <div className="exercise-fields">
                        <label className="text-center text-xs text-slate-500">
                          Sets
                          <input type="number" value={ex.sets} onChange={(e) => handleExerciseChange(i, "sets", parseInt(e.target.value) || 1)} className="mt-1 block h-11 w-14 rounded-xl border border-slate-300 bg-[#f4f8fb] text-center text-slate-900"/>
                        </label>
                        <label className="text-center text-xs text-slate-500">
                          Reps
                          <input type="text" value={ex.reps} onChange={(e) => handleExerciseChange(i, "reps", e.target.value)} className="mt-1 block h-11 w-16 rounded-xl border border-slate-300 bg-[#f4f8fb] text-center text-slate-900"/>
                        </label>
                        <label className="text-center text-xs text-slate-500">
                          Rest (sec)
                          <input type="number" min="0" aria-label={`Exercise ${i + 1} rest in seconds`} value={ex.rest_seconds} onChange={(e) => handleExerciseChange(i, "rest_seconds", parseInt(e.target.value) || 0)} className="mt-1 block h-11 w-16 rounded-xl border border-slate-300 bg-[#f4f8fb] text-center text-slate-900"/>
                        </label>
                      </div>
                      <div className="exercise-actions">
                        {ex.name.trim() && (<button onClick={() => setSwapIndex(i)} className="swap-button min-h-11 px-2 text-sm font-medium">
                            Swap
                          </button>)}
                        <button onClick={() => removeExercise(i)} aria-label={`Remove exercise ${i + 1}`} className="remove-button min-h-11 px-2 text-sm">
                          Remove
                        </button>
                      </div>
                    </div>))}
                  <button onClick={() => editRoutine({
                    ...selectedRoutine,
                    exercises: [...selectedRoutine.exercises, blankExercise],
                })} className="min-h-12 w-full rounded-[24px] border border-dashed border-[#b7c9d6] bg-white/60 text-sm font-medium text-slate-600 hover:border-[#3d6d8c]">
                    + Add exercise
                  </button>
                </div>) : (<div className="rounded-[28px] border border-dashed border-[#b7c9d6] bg-white/70 p-8 text-slate-500">
                  Create a workout or open one from My routines.
                </div>)}
            </section>

        </>
  </>;
}
