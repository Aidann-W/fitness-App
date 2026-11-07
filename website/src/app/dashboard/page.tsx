'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  fetchRoutines,
  fetchSetLogs,
  generateRoutine,
  saveRoutine,
  swapExercise,
  updateRoutineExercises,
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
import IntakeModal from './IntakeModal';
import SwapModal from './SwapModal';
import WorkoutSession from './WorkoutSession';

const ROUTINES_KEY = 'cumulusfit.routines';
const SESSION_KEY = 'cumulusfit.activeSession';
const LOGS_KEY = 'cumulusfit.setLogs';

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
  const hasUnsavedEdits = useRef(false);

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
    loadRoutines();
    loadLogs();
  }, []);

  const replaceRoutine = (updated: WorkoutRoutine) => {
    setSelectedRoutine(updated);
    setRoutines((prev) => {
      const next = prev.map((routine) => (routine.id === updated.id ? updated : routine));
      writeJson(ROUTINES_KEY, next);
      return next;
    });
  };

  const persistExercises = async (routine: WorkoutRoutine) => {
    try {
      if (isStored(routine)) {
        await updateRoutineExercises(routine.id!, routine.exercises);
        return;
      }

      // Presets are shared, so editing one saves a personal copy.
      const saved = await saveRoutine(routine);
      setSelectedRoutine(saved);
      setRoutines((prev) => {
        const next = [saved, ...prev.filter((r) => r.id || r.title !== routine.title)];
        writeJson(ROUTINES_KEY, next);
        return next;
      });
    } catch (err) {
      console.error('Failed to save edits:', err);
      setNotice('Your edits could not be saved. They will be lost if you refresh.');
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
      replaceRoutine(updated);
      persistExercises(updated);
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
    hasUnsavedEdits.current = true;
    replaceRoutine({ ...selectedRoutine, exercises: updatedExercises });
  };

  const handleEditorBlur = () => {
    if (!hasUnsavedEdits.current || !selectedRoutine) return;
    hasUnsavedEdits.current = false;
    persistExercises(selectedRoutine);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-8 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-sky-300 bg-clip-text text-transparent">
            CumulusFit Dashboard
          </h1>
          <p className="text-slate-400 text-sm">Cloud-Synced Workout Routines & AI Adaptation</p>
        </div>
        <button 
          onClick={() => setShowIntake(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg transition"
        >
          + Generate with Gemini AI
        </button>
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
              <div className="flex justify-between items-start gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedRoutine.title}</h2>
                  <p className="text-sm text-slate-400 mt-1">{selectedRoutine.description}</p>
                </div>
                <button
                  onClick={() => startWorkout(selectedRoutine)}
                  className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2.5 rounded-lg transition"
                >
                  Start workout
                </button>
              </div>

              <div className="space-y-3" onBlur={handleEditorBlur}>
                {selectedRoutine.exercises.map((ex, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
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
                      <button
                        onClick={() => setSwapIndex(i)}
                        className="min-h-11 px-3 text-sm text-blue-400 hover:text-blue-300"
                      >
                        Swap
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">Select a routine from the list</div>
          )}
        </div>
      </main>

      {showIntake && (
        <IntakeModal onGenerate={handleGenerate} onClose={() => setShowIntake(false)} />
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
