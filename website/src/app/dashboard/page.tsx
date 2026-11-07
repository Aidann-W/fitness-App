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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <header className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-4 mb-8 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-sky-300 bg-clip-text text-transparent">
            CumulusFit Dashboard
          </h1>
          <p className="text-slate-400 text-sm">Cloud-Synced Workout Routines & AI Adaptation</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!session && account && (
            account.isAnonymous ? (
              <button
                onClick={() => setShowAccount(true)}
                className="min-h-11 px-3 text-sm text-blue-400 hover:text-blue-300"
              >
                Save your progress
              </button>
            ) : (
              <>
                <span className="text-sm text-slate-400">{account.email}</span>
                <button
                  onClick={handleLogOut}
                  className="min-h-11 px-3 text-sm text-blue-400 hover:text-blue-300"
                >
                  Log out
                </button>
              </>
            )
          )}
          <button
            onClick={() => editRoutine({ title: 'My Workout', description: '', exercises: [blankExercise] })}
            disabled={Boolean(session)}
            className="min-h-11 px-4 py-2 rounded-lg border border-slate-700 text-slate-200 hover:border-slate-500 disabled:opacity-50 transition"
          >
            Build my own
          </button>
          <button
            onClick={() => setShowIntake(true)}
            disabled={Boolean(session)}
            className="min-h-11 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg transition"
          >
            + Generate with Gemini AI
          </button>
        </div>
      </header>

      {notice && (
        <p role="status" className="max-w-6xl mx-auto mb-6 p-3 rounded-lg bg-amber-950/50 border border-amber-800 text-amber-200 text-sm">
          {notice}
        </p>
      )}

      <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sidebar: Saved Routines */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-300">Your Routines</h2>
          {loading ? (
            <div className="p-4 bg-slate-900 rounded-lg animate-pulse">Loading routines...</div>
          ) : (
            [...routines, ...starterPresets].map((item, idx) => (
              <div
                key={item.id || idx}
                onClick={() => setSelectedRoutine(item)}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  (selectedRoutine?.id ?? selectedRoutine?.title) === (item.id ?? item.title)
                    ? 'border-blue-500 bg-blue-950/30'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <h3 className="font-bold text-white">{item.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 mt-1">{item.description}</p>
                <span className="inline-block mt-3 text-xs bg-slate-800 text-blue-400 px-2.5 py-1 rounded-full">
                  {item.exercises.length} Exercises
                </span>
              </div>
            ))
          )}

          {recentWorkouts.length > 0 && (
            <>
              <h2 className="text-lg font-semibold text-slate-300 pt-4">Recent Workouts</h2>
              {recentWorkouts.map((workout) => (
                <div key={workout.sessionId} className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                  <p className="text-sm font-semibold text-white">
                    {new Date(workout.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    {' · '}{workout.setCount} set(s)
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{workout.exercises.join(', ')}</p>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Main Content: Interactive Editor */}
        <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
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
              <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                <div className="flex-1 min-w-48">
                  <input
                    type="text"
                    aria-label="Routine name"
                    value={selectedRoutine.title}
                    onChange={(e) => editRoutine({ ...selectedRoutine, title: e.target.value })}
                    className="w-full bg-transparent text-2xl font-bold text-white focus:outline-none border-b border-transparent focus:border-blue-500"
                  />
                  <input
                    type="text"
                    aria-label="Routine description"
                    placeholder="Add a description"
                    value={selectedRoutine.description}
                    onChange={(e) => editRoutine({ ...selectedRoutine, description: e.target.value })}
                    className="w-full bg-transparent text-sm text-slate-400 mt-1 focus:outline-none border-b border-transparent focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {isStored(selectedRoutine) && (
                    <button
                      onClick={() => handleDeleteRoutine(selectedRoutine)}
                      className="min-h-11 px-3 text-sm text-slate-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  )}
                  <button
                    onClick={() => startWorkout(selectedRoutine)}
                    disabled={!canStart(selectedRoutine)}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-lg transition"
                  >
                    Start workout
                  </button>
                </div>
              </div>

              {!canStart(selectedRoutine) && (
                <p className="text-sm text-amber-200 mb-3">
                  Give every exercise a different name to start this workout.
                </p>
              )}

              <div className="space-y-3">
                {selectedRoutine.exercises.map((ex, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        aria-label={`Exercise ${i + 1} name`}
                        placeholder="Exercise name"
                        value={ex.name}
                        onChange={(e) => handleExerciseChange(i, 'name', e.target.value)}
                        className="bg-transparent text-white font-semibold focus:outline-none focus:border-blue-500 border-b border-transparent w-full"
                      />
                      {ex.notes && <p className="text-xs text-slate-500 mt-0.5">{ex.notes}</p>}
                      {lastSets[ex.name] && (
                        <p className="text-xs text-blue-300 mt-1">
                          Last time: {lastSets[ex.name].map(formatSet).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="text-center">
                        <span className="text-xs text-slate-500 block">Sets</span>
                        <input
                          type="number"
                          value={ex.sets}
                          onChange={(e) => handleExerciseChange(i, 'sets', parseInt(e.target.value) || 1)}
                          className="w-12 bg-slate-900 text-center text-white border border-slate-700 rounded px-1"
                        />
                      </div>
                      <div className="text-center">
                        <span className="text-xs text-slate-500 block">Reps</span>
                        <input
                          type="text"
                          value={ex.reps}
                          onChange={(e) => handleExerciseChange(i, 'reps', e.target.value)}
                          className="w-16 bg-slate-900 text-center text-white border border-slate-700 rounded px-1"
                        />
                      </div>
                      <div className="text-center">
                        <span className="text-xs text-slate-500 block">Rest (s)</span>
                        <input
                          type="number"
                          min="0"
                          aria-label={`Exercise ${i + 1} rest in seconds`}
                          value={ex.rest_seconds}
                          onChange={(e) => handleExerciseChange(i, 'rest_seconds', parseInt(e.target.value) || 0)}
                          className="w-14 bg-slate-900 text-center text-white border border-slate-700 rounded px-1"
                        />
                      </div>
                    </div>
                    <div className="flex items-center">
                      {ex.name.trim() && (
                        <button
                          onClick={() => setSwapIndex(i)}
                          className="min-h-11 px-2 text-sm text-blue-400 hover:text-blue-300"
                        >
                          Swap
                        </button>
                      )}
                      <button
                        onClick={() => removeExercise(i)}
                        aria-label={`Remove exercise ${i + 1}`}
                        className="min-h-11 px-2 text-sm text-slate-400 hover:text-red-300"
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
                className="mt-3 w-full min-h-11 rounded-xl border border-dashed border-slate-700 text-sm text-slate-300 hover:border-slate-500"
              >
                + Add exercise
              </button>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">Select a routine from the list</div>
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
