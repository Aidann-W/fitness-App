'use client';

import { useEffect, useState } from 'react';
import { deleteSetLog, logSet } from '@/lib/api';
import { formatSet } from '@/lib/history';
import type { ActiveSession, Exercise, LoggedSet, SetEntry } from '@/lib/types';

const setKey = (exerciseName: string, index: number) => `${exerciseName}:${index}`;

// Starts from what was lifted last time, otherwise the plan. Weight stays blank
// with no history, because the app should not invent a starting load.
const emptyEntry = (exercise: Exercise, previous?: LoggedSet): SetEntry => ({
  reps: String(previous?.reps ?? (parseInt(exercise.reps) || '')),
  weight: previous && previous.weight > 0 ? String(previous.weight) : '',
  done: false,
  unsaved: false,
});

interface Props {
  session: ActiveSession;
  lastSets: Record<string, LoggedSet[]>;
  onChange: (update: (prev: ActiveSession) => ActiveSession) => void;
  onFinish: () => void;
  onSwap: (index: number) => void;
}

export default function WorkoutSession({ session, lastSets, onChange, onFinish, onSwap }: Props) {
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
    return emptyEntry(exercise, previous?.[index] ?? previous?.at(-1));
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

  return (
    <div className="pb-24">
      <div className="flex justify-between items-start gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">{session.routine.title}</h2>
          <p className="text-sm text-slate-400 mt-1">Workout in progress</p>
        </div>
        <button
          onClick={handleFinish}
          disabled={unsavedSets.length > 0}
          className="shrink-0 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-lg transition"
        >
          Finish
        </button>
      </div>

      {unsavedSets.length > 0 && (
        <div role="status" className="flex items-center justify-between gap-3 mb-4 p-3 rounded-lg bg-amber-950/50 border border-amber-800 text-amber-200 text-sm">
          <span>{unsavedSets.length} set(s) not saved yet. They&apos;re safe on this device.</span>
          <button onClick={retryUnsaved} className="shrink-0 min-h-11 px-3 font-medium underline">
            Retry
          </button>
        </div>
      )}
      {error && <p role="alert" className="mb-4 text-sm text-red-300">{error}</p>}

      <div className="space-y-4">
        {session.routine.exercises.map((exercise, exerciseIndex) => {
          const started = Array.from({ length: exercise.sets }).some(
            (_, index) => entryFor(exercise, index).done
          );

          return (
            <section key={exercise.name} className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
              <div className="flex justify-between items-start gap-3 mb-3">
                <div>
                  <h3 className="font-semibold text-white">{exercise.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {exercise.sets} × {exercise.reps}, {exercise.rest_seconds}s rest
                  </p>
                  {exercise.notes && <p className="text-xs text-slate-500 mt-0.5">{exercise.notes}</p>}
                  {lastSets[exercise.name] && (
                    <p className="text-xs text-blue-300 mt-1">
                      Last time: {lastSets[exercise.name].map(formatSet).join(', ')}
                    </p>
                  )}
                </div>
                {!started && (
                  <button
                    onClick={() => onSwap(exerciseIndex)}
                    className="shrink-0 min-h-11 px-3 text-sm text-blue-400 hover:text-blue-300"
                  >
                    Swap
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {Array.from({ length: exercise.sets }, (_, index) => {
                  const entry = entryFor(exercise, index);
                  const label = `${exercise.name} set ${index + 1}`;

                  return (
                    <div key={index} className="flex items-center gap-2 text-sm text-slate-300">
                      <span className="w-6 text-slate-500">{index + 1}</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        placeholder="lb"
                        aria-label={`${label} weight in pounds`}
                        value={entry.weight}
                        disabled={entry.done}
                        onChange={(e) => updateEntry(exercise, index, { weight: e.target.value })}
                        className="w-20 min-h-11 bg-slate-900 text-center text-white border border-slate-700 rounded px-1 disabled:opacity-60"
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        placeholder="reps"
                        aria-label={`${label} reps`}
                        value={entry.reps}
                        disabled={entry.done}
                        onChange={(e) => updateEntry(exercise, index, { reps: e.target.value })}
                        className="w-20 min-h-11 bg-slate-900 text-center text-white border border-slate-700 rounded px-1 disabled:opacity-60"
                      />
                      <button
                        onClick={() => (entry.done ? undoSet(exercise, index) : completeSet(exercise, index))}
                        disabled={!entry.done && entry.reps === ''}
                        aria-label={entry.done ? `Undo ${label}` : `Complete ${label}`}
                        className={`ml-auto min-h-11 px-3 rounded-lg font-medium disabled:opacity-50 ${
                          entry.done ? 'bg-emerald-900 text-emerald-200' : 'bg-slate-800 text-white'
                        }`}
                      >
                        {entry.done ? '✓ Done' : 'Done'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {restLeft > 0 && (
        <div role="timer" className="fixed bottom-4 inset-x-4 z-10 max-w-md mx-auto flex items-center justify-between gap-3 bg-blue-950 border border-blue-700 rounded-xl px-4 py-2 text-white">
          <span className="font-semibold">
            Rest {Math.floor(restLeft / 60)}:{String(restLeft % 60).padStart(2, '0')}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onChange((prev) => ({ ...prev, restEndsAt: (prev.restEndsAt ?? Date.now()) + 30_000 }))}
              className="min-h-11 px-3 text-sm"
            >
              +30s
            </button>
            <button
              onClick={() => onChange((prev) => ({ ...prev, restEndsAt: null }))}
              className="min-h-11 px-3 text-sm font-medium"
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
