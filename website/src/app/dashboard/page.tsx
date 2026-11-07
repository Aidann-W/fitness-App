'use client';

import { useState, useEffect } from 'react';
import { WorkoutRoutine } from '@/lib/types';

export default function Dashboard() {
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoutine, setSelectedRoutine] = useState<WorkoutRoutine | null>(null);

  // Fetch routines from your Node API server on load
  useEffect(() => {
    async function loadRoutines() {
      try {
        const res = await fetch('/api/routines');
        const data = await res.json();
        setRoutines(data);
        if (data.length > 0) setSelectedRoutine(data[0]);
      } catch (err) {
        console.error('Failed to load routines:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRoutines();
  }, []);

  const handleExerciseChange = (index: number, field: string, value: any) => {
    if (!selectedRoutine) return;
    const updatedExercises = [...selectedRoutine.exercises];
    updatedExercises[index] = { ...updatedExercises[index], [field]: value };
    setSelectedRoutine({ ...selectedRoutine, exercises: updatedExercises });
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
          onClick={() => alert("Open Gemini Intake Modal")}
          className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg transition"
        >
          + Generate with Gemini AI
        </button>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sidebar: Saved Routines */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-300">Your Preset Routines</h2>
          {loading ? (
            <div className="p-4 bg-slate-900 rounded-lg animate-pulse">Loading routines...</div>
          ) : (
            routines.map((item, idx) => (
              <div
                key={item.id || idx}
                onClick={() => setSelectedRoutine(item)}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  selectedRoutine?.title === item.title
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
        </div>

        {/* Main Content: Interactive Editor */}
        <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
          {selectedRoutine ? (
            <div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedRoutine.title}</h2>
                  <p className="text-sm text-slate-400 mt-1">{selectedRoutine.description}</p>
                </div>
              </div>

              <div className="space-y-3">
                {selectedRoutine.exercises.map((ex, i) => (
                  <div key={i} className="flex items-center gap-4 bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={ex.name}
                        onChange={(e) => handleExerciseChange(i, 'name', e.target.value)}
                        className="bg-transparent text-white font-semibold focus:outline-none focus:border-blue-500 border-b border-transparent w-full"
                      />
                      {ex.notes && <p className="text-xs text-slate-500 mt-0.5">{ex.notes}</p>}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="text-center">
                        <span className="text-xs text-slate-500 block">Sets</span>
                        <input
                          type="number"
                          value={ex.sets}
                          onChange={(e) => handleExerciseChange(i, 'sets', parseInt(e.target.value))}
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
    </div>
  );
}
