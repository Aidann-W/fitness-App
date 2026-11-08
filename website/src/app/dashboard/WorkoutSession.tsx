'use client';

import { useEffect, useRef, useState } from 'react';
import './WorkoutSession.css';
import { friendlyWorkoutName } from '@/lib/workoutName';
import { deleteSetLog, logSet } from '@/lib/api';
import { formatSet, formatTarget, nextTarget, type Target } from '@/lib/history';
import type { ActiveSession, Exercise, LoggedSet, SetEntry, WorkoutRoutine } from '@/lib/types';

const setKey = (exerciseName: string, index: number) => `${exerciseName}:${index}`;

// Starts from what was lifted last time, otherwise the plan. Weight stays blank
// with no history, because the app should not invent a starting load.
// Starts from the next-session target, else last time, else the plan. Weight
// stays blank with no history, because the app should not invent a load.
const emptyEntry = (exercise: Exercise, previous?: LoggedSet, target?: Target | null): SetEntry => {
  const weight = target?.weight ?? previous?.weight ?? 0;
  return {
    reps: String(target?.reps ?? previous?.reps ?? (parseInt(exercise.reps) || '')),
    weight: weight > 0 ? String(weight) : '',
    done: false,
    unsaved: false,
  };
};

export function TargetLine({ target }: { target: Target | null }) {
  if (!target) return null;
  return (
    <p className="mt-0.5 text-xs text-slate-700">
      <span className="font-semibold">Target: {formatTarget(target)}</span> · {target.note}
    </p>
  );
}

interface Props {
  session: ActiveSession;
  lastSets: Record<string, LoggedSet[]>;
  onChange: (update: (prev: ActiveSession) => ActiveSession) => void;
  onFinish: () => void;
  onSwap: (index: number) => void;
  plans: WorkoutRoutine[];
  onSwitch: (routine: WorkoutRoutine) => void;
}

export default function WorkoutSession({ session, lastSets, onChange, onFinish, onSwap, plans, onSwitch }: Props) {
  const planDialog = useRef<HTMLDialogElement>(null);
  const previousOverflow = useRef<string | null>(null);
  useEffect(()=>()=>{if(previousOverflow.current !== null) document.body.style.overflow=previousOverflow.current;},[]);
  const switchButton = useRef<HTMLButtonElement>(null);
  const running = session.startedAt != null;
  const [selectedExercise, setSelectedExercise] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Counts down to a timestamp, so time away from the page still counts as rest.
  const { restEndsAt } = session;
  useEffect(() => {
    if (!restEndsAt && !running) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [restEndsAt, running]);

  // Older local sessions have no clock; resume their timer from now.
  useEffect(() => {
    if (session.startedAt === undefined && Object.values(session.sets).some(entry => entry.done)) onChange(prev => ({ ...prev, startedAt: Date.now() }));
  }, [session.startedAt, session.sets, onChange]);
  const elapsed = session.startedAt ? Math.max(0, Math.floor((now-session.startedAt)/1000)) : 0;
  const elapsedLabel = (elapsed>=3600 ? String(Math.floor(elapsed/3600)).padStart(2,'0')+':' : '')+String(Math.floor(elapsed/60)%60).padStart(2,'0')+':'+String(elapsed%60).padStart(2,'0');
  const begin = () => { setNow(Date.now()); onChange(prev => ({...prev,startedAt:Date.now()})); };
  const restLeft = restEndsAt ? Math.ceil((restEndsAt - now) / 1000) : 0;

  const defaultEntry = (exercise: Exercise, index: number) => {
    const previous = lastSets[exercise.name];
    return emptyEntry(exercise, previous?.[index] ?? previous?.at(-1), nextTarget(previous, exercise.reps));
  };

  const entryFor = (exercise: Exercise, index: number) =>
    session.sets[setKey(exercise.name, index)] ?? defaultEntry(exercise, index);

  const updateEntry = (exercise: Exercise, index: number, changes: Partial<SetEntry>) => {
    const key = setKey(exercise.name, index);
    onChange((prev) => ({
      ...prev,
      sets: { ...prev.sets, [key]: { ...(prev.sets[key] ?? defaultEntry(exercise, index)), ...changes } },
    }));
  };

  const saveSet = async (exercise: Exercise, index: number, entry: SetEntry) => {
    try {
      await logSet({
        session_id: session.sessionId,
        routine_id: session.routineId,
        exercise_name: exercise.name,
        set_index: index,
        reps: Number(entry.reps),
        weight: Number(entry.weight) || 0,
        unit: 'lb',
      });
      updateEntry(exercise, index, { unsaved: false });
    } catch (err) {
      console.error('Failed to save set:', err);
      updateEntry(exercise, index, { unsaved: true });
    }
  };

  const completeSet = (exercise: Exercise, index: number) => {
    const entry = entryFor(exercise, index);
    if (!running || !validEntry(entry)) return;
    updateEntry(exercise, index, { done: true, unsaved: true });
    onChange((prev) => ({ ...prev, restEndsAt: Date.now() + exercise.rest_seconds * 1000 }));
    saveSet(exercise, index, entry);
    if (Array.from({ length: exercise.sets }, (_, i) => i === index || entryFor(exercise, i).done).every(Boolean)) setSelectedExercise(null);
  };

  const undoSet = async (exercise: Exercise, index: number) => {
    setError(null);
    const entry = entryFor(exercise, index);
    if (!entry.unsaved) {
      try {
        await deleteSetLog({
          session_id: session.sessionId,
          exercise_name: exercise.name,
          set_index: index,
        });
      } catch {
        setError('Could not undo that set. Check your connection and try again.');
        return;
      }
    }
    updateEntry(exercise, index, { done: false, unsaved: false });
  };

  const unsavedSets = session.routine.exercises.flatMap((exercise) =>
    Array.from({ length: exercise.sets }, (_, index) => ({ exercise, index })).filter(
      ({ index }) => entryFor(exercise, index).unsaved
    )
  );

  const retryUnsaved = () => {
    unsavedSets.forEach(({ exercise, index }) => saveSet(exercise, index, entryFor(exercise, index)));
  };

  // Sets the user typed into but never confirmed would be lost on finish.
  const unconfirmedSets = Object.values(session.sets).filter((entry) => !entry.done).length;

  const handleFinish = () => {
    if (
      unconfirmedSets === 0 ||
      window.confirm(
        `${unconfirmedSets} set(s) you edited aren't marked Done and won't be saved. Finish anyway?`
      )
    ) {
      onFinish();
    }
  };


  const exercises = session.routine.exercises;
  const firstUnfinished = exercises.findIndex((exercise) => Array.from({ length: exercise.sets }, (_, i) => !entryFor(exercise, i).done).some(Boolean));
  const currentIndex = selectedExercise !== null && exercises[selectedExercise] ? selectedExercise : firstUnfinished >= 0 ? firstUnfinished : Math.max(0, exercises.length - 1);
  const current = exercises[currentIndex];
  const totalSets = exercises.reduce((total, exercise) => total + exercise.sets, 0);
  const completedSets = exercises.reduce((total, exercise) => total + Array.from({ length: exercise.sets }, (_, i) => entryFor(exercise, i).done).filter(Boolean).length, 0);
  const progress = totalSets ? Math.round(completedSets / totalSets * 100) : 0;
  const nextSet = current ? Array.from({ length: current.sets }, (_, i) => i).find((i) => !entryFor(current, i).done) : undefined;
  const validEntry = (entry: SetEntry) => Number.isFinite(Number(entry.reps)) && Number(entry.reps) > 0 && entry.weight.trim() !== '' && Number.isFinite(Number(entry.weight)) && Number(entry.weight) >= 0;
  const started = current && Array.from({ length: current.sets }, (_, i) => entryFor(current, i).done).some(Boolean);

  return <div className="workout-session focus-session">
    <header className="session-heading"><div><p className="eyebrow">HOME / WORKOUT</p><h1>{friendlyWorkoutName(session.routine.title)}</h1></div><div className="workout-header-actions"><button ref={switchButton} className="switch-plan-button" aria-label="Switch workout plan" title="Switch workout plan" disabled={unsavedSets.length > 0} onClick={()=>{previousOverflow.current=document.body.style.overflow;document.body.style.overflow='hidden';planDialog.current?.showModal();}}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4"/></svg></button><button className={running ? 'session-finish running-finish' : 'session-finish session-start'} onClick={running ? handleFinish : begin} disabled={running && unsavedSets.length > 0}>{running ? 'Finish workout' : 'Start workout'}</button></div></header>
    <div className="workout-clock" role="timer" aria-label="Workout elapsed time"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line className="clock-hand" x1="12" y1="12" x2="12" y2="6" style={{transform:'rotate('+elapsed*6+'deg)'}}/></svg><strong>{elapsedLabel}</strong><span>{running ? 'Workout time' : 'Ready to start'}</span></div>
    <div className="session-overview" aria-label="Session overview"><div><span>Exercises</span><strong>{exercises.length}</strong></div><div><span>Working sets</span><strong>{totalSets}</strong></div><div><span>Completed</span><strong>{completedSets}<small> / {totalSets}</small></strong></div><div className="session-progress"><span>{progress}% complete</span><div role="progressbar" aria-label="Workout completion" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div style={{transform:'scaleX('+progress/100+')'}}/></div></div></div>
    {unsavedSets.length > 0 && <div role="status" className="session-warning"><span>{unsavedSets.length} set(s) waiting to sync. Kept on this device.</span><button onClick={retryUnsaved}>Retry saving</button></div>}
    {error && <p role="alert" className="session-error">{error}</p>}
    <div className="session-workspace">
      <div className="current-workspace">
      {current ? <>
        <div className="exercise-stage"><div className="stage-copy"><p className="eyebrow">EXERCISE {String(currentIndex+1).padStart(2,'0')} / {String(exercises.length).padStart(2,'0')}</p><h3>{current.name}</h3><div className="stage-tags"><span>{current.sets} sets</span><span>{current.reps} reps</span><span>{current.rest_seconds}s rest</span></div>{current.notes && <p className="stage-note">{current.notes}</p>}{!started && <button className="stage-swap" onClick={()=>onSwap(currentIndex)}>Swap exercise</button>}</div></div>
        {nextSet !== undefined && entryFor(current,nextSet).weight.trim() === '' && <div className="weight-reminder" role="status"><strong>What weight are you lifting?</strong><p>Add it below before logging your set. Using just your body weight? Enter 0.</p></div>}
        <section className="set-logger" aria-labelledby="set-logger-title"><div className="logger-heading"><h3 id="set-logger-title">Your sets</h3><div className="total-set-tracker"><strong>{completedSets}<small> / {totalSets}</small></strong><span>total sets logged</span><div role="progressbar" aria-label="Total sets logged" aria-valuenow={completedSets} aria-valuemin={0} aria-valuemax={totalSets}><div style={{transform:'scaleX('+(totalSets?completedSets/totalSets:0)+')'}}/></div></div><span>{nextSet === undefined ? 'All sets complete' : 'Up next: set '+(nextSet+1)}</span></div>
          {lastSets[current.name] && <p className="previous-sets">Last session: {lastSets[current.name].map(formatSet).join(', ')}</p>}
          <TargetLine target={nextTarget(lastSets[current.name],current.reps)} />
          <table className="set-table"><thead><tr><th>Set</th><th>Weight <span>(lb)</span></th><th>Reps</th><th>Status</th></tr></thead><tbody>{Array.from({length:current.sets},(_,index)=>{const entry=entryFor(current,index);const label=current.name+' set '+(index+1);return <tr key={label} data-completed={entry.done}><td><span className="set-number">{String(index+1).padStart(2,'0')}</span></td><td><input aria-label={label+' weight in pounds'} type="number" inputMode="decimal" min="0" step="any" placeholder="—" value={entry.weight} disabled={entry.done} onChange={e=>updateEntry(current,index,{weight:e.target.value})}/></td><td><input aria-label={label+' reps'} type="number" inputMode="numeric" min="1" value={entry.reps} disabled={entry.done} onChange={e=>updateEntry(current,index,{reps:e.target.value})}/></td><td><button className={entry.done?'set-done':'set-complete'} aria-label={(entry.done?'Undo ':'Complete ')+label} onClick={()=>entry.done?undoSet(current,index):completeSet(current,index)} disabled={!entry.done && (!running || !validEntry(entry))}>{entry.done ? '✓ Done' : 'Log set'}</button></td></tr>})}</tbody></table>
          <div className="session-rest" role={restLeft > 0 ? 'timer' : undefined}><div><span className="rest-symbol" aria-hidden="true">◷</span><div><strong>{restLeft > 0 ? Math.floor(restLeft/60)+':'+String(restLeft%60).padStart(2,'0') : 'Ready when you are'}</strong><p>{restLeft > 0 ? 'Rest before your next set' : current.rest_seconds+'s rest after each set'}</p></div></div>{restLeft > 0 && <div className="rest-actions"><button onClick={()=>onChange(prev=>({...prev,restEndsAt:(prev.restEndsAt ?? Date.now())+30000}))}>+30s</button><button onClick={()=>onChange(prev=>({...prev,restEndsAt:null}))}>Skip rest</button></div>}</div>
        </section>
        <div className="session-bottom-actions">{nextSet !== undefined ? <button className="session-primary" disabled={!running || !validEntry(entryFor(current,nextSet))} onClick={()=>completeSet(current,nextSet)}>Log set {nextSet+1}</button> : <span className="exercise-completed">✓ Exercise complete</span>}{currentIndex < exercises.length-1 ? <button className="next-exercise" onClick={()=>setSelectedExercise(currentIndex+1)}>Next exercise <span aria-hidden="true">→</span></button> : <button className="session-finish running-finish" onClick={handleFinish} disabled={!running || unsavedSets.length > 0}>Finish workout</button>}</div>
      </> : <p className="session-warning">This workout has no exercises. Finish it to create another workout.</p>}
      </div>
      <aside className="exercise-queue" aria-labelledby="queue-heading"><div className="queue-heading"><h3 id="queue-heading">Workout plan</h3><span>{exercises.length} exercises</span></div><ol>{exercises.map((exercise,i)=>{const done=Array.from({length:exercise.sets},(_,j)=>entryFor(exercise,j).done).filter(Boolean).length;return <li key={exercise.name}><button aria-current={i===currentIndex?'step':undefined} onClick={()=>setSelectedExercise(i)}><span className="queue-marker">{done===exercise.sets?'✓':String(i+1).padStart(2,'0')}</span><span className="queue-details"><strong>{exercise.name}</strong><small>{exercise.sets} × {exercise.reps} · {exercise.rest_seconds}s rest</small><span>{done===exercise.sets?'Complete':done>0?done+' of '+exercise.sets+' sets logged':i===currentIndex?'Current exercise':'Not started'}</span></span></button></li>})}</ol></aside>
    </div>
    <dialog ref={planDialog} className="plan-switch-dialog" aria-labelledby="plan-switch-title" onClose={() => { if (previousOverflow.current !== null) { document.body.style.overflow = previousOverflow.current; previousOverflow.current = null; } switchButton.current?.focus(); }}>
      <div className="plan-switch-heading"><h2 id="plan-switch-title">Choose your workout</h2><button aria-label="Close workout plans" onClick={() => planDialog.current?.close()}>×</button></div>
      <p>Pick a saved routine or try a starter workout. Saved sets stay in your activity.</p>
      <div className="plan-options">{plans.filter((plan, index, all) => plan.exercises.length > 0 && plan.exercises.every(exercise => exercise.name.trim()) && new Set(plan.exercises.map(exercise => exercise.name.trim().toLowerCase())).size === plan.exercises.length && all.findIndex(other => other.id ? other.id === plan.id : other.title === plan.title) === index).map((plan, index) => <button key={plan.id ?? index} onClick={() => { onSwitch(plan); planDialog.current?.close(); }}><strong>{friendlyWorkoutName(plan.title)}</strong><span>{plan.exercises.length} exercises · {plan.exercises.reduce((total, exercise) => total + exercise.sets, 0)} sets</span></button>)}</div>
    </dialog>
  </div>;
}
