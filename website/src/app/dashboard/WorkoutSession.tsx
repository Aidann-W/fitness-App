'use client';

import { useEffect, useState } from 'react';
import './WorkoutSession.css';
import { deleteSetLog, logSet } from '@/lib/api';
import { formatSet, formatTarget, nextTarget, type Target } from '@/lib/history';
import type { ActiveSession, Exercise, LoggedSet, SetEntry } from '@/lib/types';

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
}

export default function WorkoutSession({ session, lastSets, onChange, onFinish, onSwap }: Props) {
  const [selectedExercise, setSelectedExercise] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Counts down to a timestamp, so time away from the page still counts as rest.
  const { restEndsAt } = session;
  useEffect(() => {
    if (!restEndsAt) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [restEndsAt]);

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
  const currentIndex = selectedExercise !== null && exercises[selectedExercise] ? selectedExercise : Math.max(0, firstUnfinished);
  const current = exercises[currentIndex];
  const totalSets = exercises.reduce((total, exercise) => total + exercise.sets, 0);
  const completedSets = exercises.reduce((total, exercise) => total + Array.from({ length: exercise.sets }, (_, i) => entryFor(exercise, i).done).filter(Boolean).length, 0);
  const progress = totalSets ? Math.round(completedSets / totalSets * 100) : 0;
  const nextSet = current ? Array.from({ length: current.sets }, (_, i) => i).find((i) => !entryFor(current, i).done) : undefined;
  const validEntry = (entry: SetEntry) => Number.isFinite(Number(entry.reps)) && Number(entry.reps) > 0 && Number.isFinite(Number(entry.weight)) && Number(entry.weight) >= 0;
  const started = current && Array.from({ length: current.sets }, (_, i) => entryFor(current, i).done).some(Boolean);

  return <div className="workout-session focus-session">
    <header className="session-heading"><div><p className="eyebrow">WORKOUT IN PROGRESS</p><h2>{session.routine.title}</h2></div><button className="session-finish" onClick={handleFinish} disabled={unsavedSets.length > 0}>Finish workout</button></header>
    <div className="session-overview" aria-label="Session overview"><div><span>Exercises</span><strong>{exercises.length}</strong></div><div><span>Working sets</span><strong>{totalSets}</strong></div><div><span>Completed</span><strong>{completedSets}<small> / {totalSets}</small></strong></div><div className="session-progress"><span>{progress}% complete</span><div role="progressbar" aria-label="Workout completion" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div style={{width: progress+'%'}}/></div></div></div>
    {unsavedSets.length > 0 && <div role="status" className="session-warning"><span>{unsavedSets.length} set(s) waiting to sync. Kept on this device.</span><button onClick={retryUnsaved}>Retry saving</button></div>}
    {error && <p role="alert" className="session-error">{error}</p>}
    <div className="session-workspace">
      <div className="current-workspace">
      {current ? <>
        <div className="exercise-stage"><div className="stage-copy"><p className="eyebrow">EXERCISE {String(currentIndex+1).padStart(2,'0')} / {String(exercises.length).padStart(2,'0')}</p><h3>{current.name}</h3><div className="stage-tags"><span>{current.sets} sets</span><span>{current.reps} reps</span><span>{current.rest_seconds}s rest</span></div>{current.notes && <p className="stage-note">{current.notes}</p>}{!started && <button className="stage-swap" onClick={()=>onSwap(currentIndex)}>Swap exercise</button>}</div></div>
        <section className="set-logger" aria-labelledby="set-logger-title"><div className="logger-heading"><h3 id="set-logger-title">Your sets</h3><span>{nextSet === undefined ? 'All sets complete' : 'Up next: set '+(nextSet+1)}</span></div>
          {lastSets[current.name] && <p className="previous-sets">Last session: {lastSets[current.name].map(formatSet).join(', ')}</p>}
          <TargetLine target={nextTarget(lastSets[current.name],current.reps)} />
          <table className="set-table"><thead><tr><th>Set</th><th>Weight <span>(lb)</span></th><th>Reps</th><th>Status</th></tr></thead><tbody>{Array.from({length:current.sets},(_,index)=>{const entry=entryFor(current,index);const label=current.name+' set '+(index+1);return <tr key={label} data-completed={entry.done}><td><span className="set-number">{String(index+1).padStart(2,'0')}</span></td><td><input aria-label={label+' weight in pounds'} type="number" inputMode="decimal" min="0" step="any" placeholder="—" value={entry.weight} disabled={entry.done} onChange={e=>updateEntry(current,index,{weight:e.target.value})}/></td><td><input aria-label={label+' reps'} type="number" inputMode="numeric" min="1" value={entry.reps} disabled={entry.done} onChange={e=>updateEntry(current,index,{reps:e.target.value})}/></td><td><button className={entry.done?'set-done':'set-complete'} aria-label={(entry.done?'Undo ':'Complete ')+label} onClick={()=>entry.done?undoSet(current,index):completeSet(current,index)} disabled={!entry.done && !validEntry(entry)}>{entry.done ? '✓ Done' : 'Log set'}</button></td></tr>})}</tbody></table>
          <div className="session-rest" role={restLeft > 0 ? 'timer' : undefined}><div><span className="rest-symbol" aria-hidden="true">◷</span><div><strong>{restLeft > 0 ? Math.floor(restLeft/60)+':'+String(restLeft%60).padStart(2,'0') : 'Ready when you are'}</strong><p>{restLeft > 0 ? 'Rest before your next set' : current.rest_seconds+'s rest after each set'}</p></div></div>{restLeft > 0 && <div className="rest-actions"><button onClick={()=>onChange(prev=>({...prev,restEndsAt:(prev.restEndsAt ?? Date.now())+30000}))}>+30s</button><button onClick={()=>onChange(prev=>({...prev,restEndsAt:null}))}>Skip rest</button></div>}</div>
        </section>
        <div className="session-bottom-actions">{nextSet !== undefined ? <button className="session-primary" disabled={!validEntry(entryFor(current,nextSet))} onClick={()=>completeSet(current,nextSet)}>Log set {nextSet+1}</button> : <span className="exercise-completed">✓ Exercise complete</span>}{currentIndex < exercises.length-1 && <button className="next-exercise" onClick={()=>setSelectedExercise(currentIndex+1)}>Next exercise <span aria-hidden="true">→</span></button>}</div>
      </> : <p className="session-warning">This workout has no exercises. Finish it to create another workout.</p>}
      </div>
      <aside className="exercise-queue" aria-labelledby="queue-heading"><div className="queue-heading"><h3 id="queue-heading">Workout plan</h3><span>{exercises.length} exercises</span></div><ol>{exercises.map((exercise,i)=>{const done=Array.from({length:exercise.sets},(_,j)=>entryFor(exercise,j).done).filter(Boolean).length;return <li key={exercise.name}><button aria-current={i===currentIndex?'step':undefined} onClick={()=>setSelectedExercise(i)}><span className="queue-marker">{done===exercise.sets?'✓':String(i+1).padStart(2,'0')}</span><span className="queue-details"><strong>{exercise.name}</strong><small>{exercise.sets} × {exercise.reps} · {exercise.rest_seconds}s rest</small><span>{done===exercise.sets?'Complete':done>0?done+' of '+exercise.sets+' sets logged':i===currentIndex?'Current exercise':'Not started'}</span></span></button></li>})}</ol><p className="queue-help">Choose any exercise to view its sets. Moving ahead won’t mark unfinished sets complete.</p></aside>
    </div>
  </div>;
}
