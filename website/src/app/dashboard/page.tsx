'use client';

import { useState, useEffect, useMemo } from 'react';
import { getAccount, logOut, type Account } from '@/lib/account';
import {
  deleteRoutine,
  fetchRoutines,
  fetchSetLogs,
  generateRoutine,
  saveRoutine,
  swapExercise,
  updateRoutine,
} from '@/lib/api';
import { formatSet, lastSetsByExercise, summarizeWorkouts } from '@/lib/history';
import { starterPresets } from '@/lib/mockData';
import { readJson, writeJson } from '@/lib/storage';
import type {
  ActiveSession,
  Exercise,
  LoggedSet,
  RoutineAnswers,
  WorkoutRoutine,
} from '@/lib/types';
import AccountModal from './AccountModal';
import IntakeModal from './IntakeModal';
import SwapModal from './SwapModal';
import WorkoutSession from './WorkoutSession';

const ROUTINES_KEY = 'cumulusfit.routines';
const SESSION_KEY = 'cumulusfit.activeSession';
const LOGS_KEY = 'cumulusfit.setLogs';

const AUTOSAVE_DELAY_MS = 600;

const blankExercise: Exercise = { name: '', sets: 3, reps: '10', rest_seconds: 60, notes: '' };

// A workout tracks sets by exercise name, so names must be filled in and unique.
const canStart = (routine: WorkoutRoutine) => {
  const names = routine.exercises.map((exercise) => exercise.name.trim());
  return names.length > 0 && names.every(Boolean) && new Set(names).size === names.length;
};

// Presets and unsaved routines have no row in Supabase to update.
const isStored = (routine: WorkoutRoutine) =>
  Boolean(routine.id) && !starterPresets.some((preset) => preset.id === routine.id);

export default function Dashboard() {
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoutine, setSelectedRoutine] = useState<WorkoutRoutine | null>(null);
  const [showIntake, setShowIntake] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [swapIndex, setSwapIndex] = useState<number | null>(null);
  const [logs, setLogs] = useState<LoggedSet[]>([]);
  const [pendingSave, setPendingSave] = useState<WorkoutRoutine | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [showAccount, setShowAccount] = useState(false);

  const lastSets = useMemo(
    () => lastSetsByExercise(logs, session?.sessionId),
    [logs, session?.sessionId]
  );
  const recentWorkouts = useMemo(() => summarizeWorkouts(logs).slice(0, 5), [logs]);

  const loadLogs = async () => {
    try {
      const saved = await fetchSetLogs();
      writeJson(LOGS_KEY, saved);
      setLogs(saved);
    } catch (err) {
      console.error('Failed to load workout history:', err);
      setLogs(readJson<LoggedSet[]>(LOGS_KEY) ?? []);
    }
  };

  // Fetch the user's saved routines on load. Presets are always available.
  useEffect(() => {
    async function loadRoutines() {
      try {
        const saved = await fetchRoutines();
        writeJson(ROUTINES_KEY, saved);
        setRoutines(saved);
        setSelectedRoutine(saved[0] ?? starterPresets[0]);
      } catch (err) {
        console.error('Failed to load routines:', err);
        const cached = readJson<WorkoutRoutine[]>(ROUTINES_KEY) ?? [];
        setRoutines(cached);
        setSelectedRoutine(cached[0] ?? starterPresets[0]);
        setNotice(
          cached.length > 0
            ? "Can't reach the cloud. Showing the routines saved on this device."
            : 'Could not load your saved routines. Showing presets only.'
        );
      } finally {
        setLoading(false);
      }
    }
    setSession(readJson<ActiveSession>(SESSION_KEY));
    // Routines load first because that is what starts the anonymous session.
    loadRoutines().then(() => getAccount()).then(setAccount);
    loadLogs();
  }, []);

  // Autosave once typing pauses.
  useEffect(() => {
    if (!pendingSave) return;

    const timer = setTimeout(async () => {
      try {
        await updateRoutine(pendingSave);
      } catch (err) {
        console.error('Failed to save edits:', err);
        setNotice('Your edits could not be saved. They will be lost if you refresh.');
      }
    }, AUTOSAVE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [pendingSave]);

  // Every edit to a routine goes through here. Presets are shared, so the first
  // edit makes a personal copy with its own id.
  const editRoutine = (updated: WorkoutRoutine) => {
    const stored = isStored(updated);
    const preset = starterPresets.find((p) => p.id === updated.id);
    const routine = stored
      ? updated
      : {
          ...updated,
          id: crypto.randomUUID(),
          title: updated.title === preset?.title ? `${updated.title} (my copy)` : updated.title,
        };

    setSelectedRoutine(routine);
    setRoutines((prev) => {
      const next = stored
        ? prev.map((r) => (r.id === routine.id ? routine : r))
        : [routine, ...prev.filter((r) => r.id || r !== selectedRoutine)];
      writeJson(ROUTINES_KEY, next);
      return next;
    });
    setPendingSave(routine);
  };

  const handleDeleteRoutine = async (routine: WorkoutRoutine) => {
    if (!window.confirm(`Delete "${routine.title}"? Your logged sets will be kept.`)) return;

    try {
      setPendingSave(null);
      await deleteRoutine(routine.id!);
      const next = routines.filter((r) => r.id !== routine.id);
      writeJson(ROUTINES_KEY, next);
      setRoutines(next);
      setSelectedRoutine(next[0] ?? starterPresets[0]);
    } catch (err) {
      console.error('Failed to delete routine:', err);
      setNotice('Could not delete that routine. Please try again.');
    }
  };

  const reloadAfterAccountChange = () => {
    [ROUTINES_KEY, LOGS_KEY, SESSION_KEY].forEach((key) => writeJson(key, null));
    window.location.reload();
  };

  const handleLogOut = async () => {
    try {
      await logOut();
      reloadAfterAccountChange();
    } catch (err) {
      console.error('Failed to log out:', err);
      setNotice('Could not log out. Please try again.');
    }
  };

  const updateSession = (update: (prev: ActiveSession) => ActiveSession) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = update(prev);
      writeJson(SESSION_KEY, next);
      return next;
    });
  };

  const startWorkout = (routine: WorkoutRoutine) => {
    const next: ActiveSession = {
      sessionId: crypto.randomUUID(),
      routineId: isStored(routine) ? routine.id! : null,
      routine,
      sets: {},
      restEndsAt: null,
    };
    writeJson(SESSION_KEY, next);
    setSession(next);
  };

  const finishWorkout = async () => {
    const setCount = session
      ? Object.values(session.sets).filter((entry) => entry.done).length
      : 0;
    writeJson(SESSION_KEY, null);
    setSession(null);
    setNotice(`Workout finished. ${setCount} set(s) saved.`);
    await loadLogs();
  };

  const swapRoutine = session?.routine ?? selectedRoutine;

  const handleSwap = async (reason: string) => {
    if (!swapRoutine || swapIndex === null) return;

    const others = swapRoutine.exercises
      .filter((_, i) => i !== swapIndex)
      .map((exercise) => exercise.name);
    const replacement: Exercise = await swapExercise(swapRoutine.exercises[swapIndex], others, reason);

    const exercises = [...swapRoutine.exercises];
    exercises[swapIndex] = replacement;
    const updated = { ...swapRoutine, exercises };

    if (session) {
      updateSession((prev) => ({ ...prev, routine: updated }));
    } else {
      editRoutine(updated);
    }
    setSwapIndex(null);
  };

  const handleGenerate = async (answers: RoutineAnswers) => {
    const generated = await generateRoutine(answers);

    try {
      const saved = await saveRoutine(generated);
      setRoutines((prev) => [saved, ...prev]);
      setSelectedRoutine(saved);
      setNotice(null);
    } catch (err) {
      console.error('Failed to save routine:', err);
      setRoutines((prev) => [generated, ...prev]);
      setSelectedRoutine(generated);
      setNotice('Your workout was generated but not saved. It will be lost if you refresh.');
    }

    setShowIntake(false);
  };

  const handleExerciseChange = (index: number, field: string, value: any) => {
    if (!selectedRoutine) return;
    const updatedExercises = [...selectedRoutine.exercises];
    updatedExercises[index] = { ...updatedExercises[index], [field]: value };
    editRoutine({ ...selectedRoutine, exercises: updatedExercises });
  };

  const removeExercise = (index: number) => {
    if (!selectedRoutine) return;
    editRoutine({
      ...selectedRoutine,
      exercises: selectedRoutine.exercises.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="min-h-screen bg-[#e7eef3] font-sans text-slate-800">
      <header className="border-b border-[#d5e0e8] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-8 py-5">
          <div className="flex items-baseline gap-3">
            <span className="text-xl font-semibold tracking-tight text-slate-900">Forge</span>
            <span className="text-sm text-slate-500">Strength training</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!session && account && (
              account.isAnonymous ? (
                <button
                  onClick={() => setShowAccount(true)}
                  className="min-h-11 rounded-full px-4 text-sm font-medium text-[#3d6d8c] hover:bg-[#e7eef3]"
                >
                  Save your progress
                </button>
              ) : (
                <>
                  <span className="px-2 text-sm text-slate-500">{account.email}</span>
                  <button
                    onClick={handleLogOut}
                    className="min-h-11 rounded-full px-4 text-sm font-medium text-[#3d6d8c] hover:bg-[#e7eef3]"
                  >
                    Log out
                  </button>
                </>
              )
            )}
            <button
              onClick={() => editRoutine({ title: 'My Workout', description: '', exercises: [blankExercise] })}
              disabled={Boolean(session)}
              className="min-h-11 rounded-full border border-[#d5e0e8] bg-white px-4 text-sm font-medium text-slate-800 hover:border-[#b7c9d6] disabled:opacity-50"
            >
              Build my own
            </button>
            <button
              onClick={() => setShowIntake(true)}
              disabled={Boolean(session)}
              className="min-h-11 rounded-full bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Generate
            </button>
          </div>
        </div>
      </header>

      {notice && (
        <p role="status" className="mx-auto mt-6 max-w-6xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {notice}
        </p>
      )}

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-8 py-8 md:grid-cols-3">
        <div className="space-y-3">
          <h2 className="px-1 text-sm font-medium text-[#3d6d8c]">Your routines</h2>
          {loading ? (
            <div className="animate-pulse rounded-3xl border border-[#d5e0e8] bg-white p-4 text-slate-500">Loading routines...</div>
          ) : (
            [...routines, ...starterPresets].map((item, idx) => {
              const selected = (selectedRoutine?.id ?? selectedRoutine?.title) === (item.id ?? item.title);
              return (
                <div
                  key={item.id || idx}
                  onClick={() => setSelectedRoutine(item)}
                  className={`cursor-pointer rounded-3xl border bg-white p-4 transition ${
                    selected
                      ? 'border-[#3d6d8c] shadow-[0_12px_40px_rgba(30,58,82,0.06)]'
                      : 'border-[#d5e0e8] hover:border-[#b7c9d6]'
                  }`}
                >
                  <h3 className="font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.description}</p>
                  <span className="mt-3 inline-block rounded-full bg-[#e7eef3] px-2.5 py-1 text-xs font-semibold text-[#3d6d8c]">
                    {item.exercises.length} exercises
                  </span>
                </div>
              );
            })
          )}

          {recentWorkouts.length > 0 && (
            <>
              <h2 className="px-1 pt-4 text-sm font-medium text-[#3d6d8c]">Recent workouts</h2>
              {recentWorkouts.map((workout) => (
                <div key={workout.sessionId} className="rounded-3xl border border-[#d5e0e8] bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {new Date(workout.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    {' · '}{workout.setCount} set(s)
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{workout.exercises.join(', ')}</p>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="rounded-3xl border border-[#d5e0e8] bg-white p-6 shadow-[0_12px_40px_rgba(30,58,82,0.06)] md:col-span-2">
          {session ? (
            <WorkoutSession
              session={session}
              lastSets={lastSets}
              onChange={updateSession}
              onFinish={finishWorkout}
              onSwap={setSwapIndex}
            />
          ) : selectedRoutine ? (
            <div>
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-48 flex-1">
                  <input
                    type="text"
                    aria-label="Routine name"
                    value={selectedRoutine.title}
                    onChange={(e) => editRoutine({ ...selectedRoutine, title: e.target.value })}
                    className="w-full border-b border-transparent bg-transparent text-2xl font-semibold text-slate-900 focus:border-[#3d6d8c] focus:outline-none"
                  />
                  <input
                    type="text"
                    aria-label="Routine description"
                    placeholder="Add a description"
                    value={selectedRoutine.description}
                    onChange={(e) => editRoutine({ ...selectedRoutine, description: e.target.value })}
                    className="mt-1 w-full border-b border-transparent bg-transparent text-sm text-slate-500 focus:border-[#3d6d8c] focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {isStored(selectedRoutine) && (
                    <button
                      onClick={() => handleDeleteRoutine(selectedRoutine)}
                      className="min-h-11 rounded-full px-3 text-sm text-slate-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  )}
                  <button
                    onClick={() => startWorkout(selectedRoutine)}
                    disabled={!canStart(selectedRoutine)}
                    className="min-h-11 rounded-full bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    Start workout
                  </button>
                </div>
              </div>

              {!canStart(selectedRoutine) && (
                <p className="mb-3 text-sm text-amber-800">
                  Give every exercise a different name to start this workout.
                </p>
              )}

              <div className="space-y-3">
                {selectedRoutine.exercises.map((ex, i) => (
                  <div key={i} className="flex flex-col gap-3 rounded-2xl border border-[#d5e0e8] bg-[#f4f8fb] p-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <input
                        type="text"
                        aria-label={`Exercise ${i + 1} name`}
                        placeholder="Exercise name"
                        value={ex.name}
                        onChange={(e) => handleExerciseChange(i, 'name', e.target.value)}
                        className="w-full border-b border-transparent bg-transparent font-semibold text-slate-900 focus:border-[#3d6d8c] focus:outline-none"
                      />
                      {ex.notes && <p className="mt-0.5 text-xs text-slate-500">{ex.notes}</p>}
                      {lastSets[ex.name] && (
                        <p className="mt-1 text-xs text-[#3d6d8c]">
                          Last time: {lastSets[ex.name].map(formatSet).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="text-center">
                        <span className="block text-xs text-slate-500">Sets</span>
                        <input
                          type="number"
                          value={ex.sets}
                          onChange={(e) => handleExerciseChange(i, 'sets', parseInt(e.target.value) || 1)}
                          className="h-11 w-14 rounded-xl border border-slate-300 bg-white text-center text-slate-900"
                        />
                      </div>
                      <div className="text-center">
                        <span className="block text-xs text-slate-500">Reps</span>
                        <input
                          type="text"
                          value={ex.reps}
                          onChange={(e) => handleExerciseChange(i, 'reps', e.target.value)}
                          className="h-11 w-16 rounded-xl border border-slate-300 bg-white text-center text-slate-900"
                        />
                      </div>
                      <div className="text-center">
                        <span className="block text-xs text-slate-500">Rest (s)</span>
                        <input
                          type="number"
                          min="0"
                          aria-label={`Exercise ${i + 1} rest in seconds`}
                          value={ex.rest_seconds}
                          onChange={(e) => handleExerciseChange(i, 'rest_seconds', parseInt(e.target.value) || 0)}
                          className="h-11 w-16 rounded-xl border border-slate-300 bg-white text-center text-slate-900"
                        />
                      </div>
                    </div>
                    <div className="flex items-center">
                      {ex.name.trim() && (
                        <button
                          onClick={() => setSwapIndex(i)}
                          className="min-h-11 px-2 text-sm font-medium text-[#3d6d8c] hover:text-slate-900"
                        >
                          Swap
                        </button>
                      )}
                      <button
                        onClick={() => removeExercise(i)}
                        aria-label={`Remove exercise ${i + 1}`}
                        className="min-h-11 px-2 text-sm text-slate-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() =>
                  editRoutine({
                    ...selectedRoutine,
                    exercises: [...selectedRoutine.exercises, blankExercise],
                  })
                }
                className="mt-3 min-h-11 w-full rounded-2xl border border-dashed border-[#b7c9d6] text-sm font-medium text-slate-600 hover:border-[#3d6d8c] hover:text-slate-900"
              >
                + Add exercise
              </button>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500">Select a routine from the list</div>
          )}
        </div>
      </main>

      {showIntake && (
        <IntakeModal onGenerate={handleGenerate} onClose={() => setShowIntake(false)} />
      )}

      {showAccount && (
        <AccountModal onSignedIn={reloadAfterAccountChange} onClose={() => setShowAccount(false)} />
      )}

      {swapIndex !== null && swapRoutine && (
        <SwapModal
          exercise={swapRoutine.exercises[swapIndex]}
          onSwap={handleSwap}
          onClose={() => setSwapIndex(null)}
        />
      )}
    </div>
  );
}
