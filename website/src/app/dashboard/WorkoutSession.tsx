'use client';

import { useEffect, useState } from 'react';
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
    <div className="workout-session pb-24">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{session.routine.title}</h2>
          <p className="mt-1 text-sm text-slate-500">Workout in progress</p>
        </div>
        <button
          onClick={handleFinish}
          disabled={unsavedSets.length > 0}
          className="shrink-0 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          Finish
        </button>
      </div>

      {unsavedSets.length > 0 && (
        <div role="status" className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <span>{unsavedSets.length} set(s) not saved yet. They&apos;re safe on this device.</span>
          <button onClick={retryUnsaved} className="shrink-0 min-h-11 px-3 font-medium underline">
            Retry
          </button>
        </div>
      )}
      {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}

      <div className="space-y-4">
        {session.routine.exercises
          .map((exercise, exerciseIndex) => ({ exercise, exerciseIndex }))
          .sort((a, b) => {
            const unfinished = (exercise: Exercise) =>
              Array.from({ length: exercise.sets }).some((_, index) => !entryFor(exercise, index).done);
            return Number(!unfinished(a.exercise)) - Number(!unfinished(b.exercise));
          })
          .map(({ exercise, exerciseIndex }, visualIndex) => {
          const started = Array.from({ length: exercise.sets }).some(
            (_, index) => entryFor(exercise, index).done
          );
          const current = visualIndex === 0;

          return (
            <section key={exercise.name} className={`rounded-[28px] border border-[#d5e0e8] bg-white p-5 ${current ? "shadow-[0_12px_40px_rgba(30,58,82,0.06)]" : ""}`}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  {current && <p className="text-sm font-medium text-[#3d6d8c]">Now</p>}
                  <h3 className={`${current ? "text-2xl" : "text-lg"} font-semibold text-slate-900`}>{exercise.name}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {exercise.sets} × {exercise.reps}, {exercise.rest_seconds}s rest
                  </p>
                  {exercise.notes && <p className="mt-0.5 text-xs text-slate-500">{exercise.notes}</p>}
                  {lastSets[exercise.name] && (
                    <p className="mt-1 text-xs text-[#3d6d8c]">
                      Last time: {lastSets[exercise.name].map(formatSet).join(', ')}
                    </p>
                  )}
                  <TargetLine target={nextTarget(lastSets[exercise.name], exercise.reps)} />
                </div>
                {!started && (
                  <button
                    onClick={() => onSwap(exerciseIndex)}
                    className="shrink-0 min-h-11 px-3 text-sm font-medium text-[#3d6d8c] hover:text-slate-900"
                  >
                    Swap
                  </button>
                )}
              </div>

              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="pb-2 font-medium">Set</th>
                    <th className="pb-2 font-medium">Weight</th>
                    <th className="pb-2 font-medium">Reps</th>
                    <th className="pb-2 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                {Array.from({ length: exercise.sets }, (_, index) => {
                  const entry = entryFor(exercise, index);
                  const label = `${exercise.name} set ${index + 1}`;

                  return (
                    <tr key={index} className="border-t border-[#e6eef3] text-slate-700">
                      <td className="py-2 text-slate-500">{index + 1}</td>
                      <td className="py-2">
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
                        className="h-11 w-20 sm:w-24 rounded-xl border border-slate-300 bg-[#f4f8fb] text-center text-slate-900 disabled:opacity-60"
                      />
                      </td>
                      <td className="py-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        placeholder="reps"
                        aria-label={`${label} reps`}
                        value={entry.reps}
                        disabled={entry.done}
                        onChange={(e) => updateEntry(exercise, index, { reps: e.target.value })}
                        className="h-11 w-20 sm:w-24 rounded-xl border border-slate-300 bg-[#f4f8fb] text-center text-slate-900 disabled:opacity-60"
                      />
                      </td>
                      <td className="py-2 text-right">
                      <button
                        onClick={() => (entry.done ? undoSet(exercise, index) : completeSet(exercise, index))}
                        disabled={!entry.done && entry.reps === ''}
                        aria-label={entry.done ? `Undo ${label}` : `Complete ${label}`}
                        className={`min-h-11 rounded-full px-4 font-semibold disabled:opacity-50 ${
                          entry.done ? 'bg-[#e7eef3] text-[#1e4a66]' : 'bg-slate-900 text-white'
                        }`}
                      >
                        {entry.done ? 'Done' : 'Mark done'}
                      </button>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>

      {restLeft > 0 && (
        <div role="timer" className="fixed inset-x-4 bottom-4 z-10 mx-auto flex max-w-md items-center justify-between gap-3 rounded-full border border-[#d5e0e8] bg-white px-5 py-2 text-slate-900 shadow-[0_12px_40px_rgba(30,58,82,0.12)]">
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
