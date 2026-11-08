'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { customItems, customizeRoutineAnswers } from '@/lib/routineCustomization';
import type { RoutineAnswers } from '@/lib/types';
import WorkoutQuiz from './WorkoutQuiz';

const GOALS = ['Strength', 'Muscle building', 'General fitness'];
const EXPERIENCE = ['Beginner', 'Intermediate'];
const EQUIPMENT = ['Barbell', 'Dumbbells', 'Bench', 'Squat rack', 'Cable machine', 'Leg press', 'Pull-up bar', 'Bodyweight only'];
const MINUTES = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 75, 90, 120];
const FOCUS = ['Full body', 'Upper body', 'Lower body', 'Push', 'Pull'];

const fieldClass = 'w-full h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900';

interface Props {
  onGenerate: (answers: RoutineAnswers) => Promise<void>;
  onClose: () => void;
}

export default function IntakeModal({ onGenerate, onClose }: Props) {
  const [mode, setMode] = useState<'quiz' | 'quick'>('quiz');
  const [answers, setAnswers] = useState<RoutineAnswers>({
    goal: GOALS[1],
    experience: EXPERIENCE[0],
    equipment: ['Dumbbells', 'Bench'],
    minutes: 45,
    focus: FOCUS[0],
  });
  const [customEquipment, setCustomEquipment] = useState('');
  const [preferredExercises, setPreferredExercises] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const element = dialog.current;
    element?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleEquipment = (item: string) => {
    setAnswers((prev) => ({
      ...prev,
      equipment: prev.equipment.includes(item)
        ? prev.equipment.filter((e) => e !== item)
        : [...prev.equipment, item],
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await generate();
  };

  const generate = async (context?: RoutineAnswers['context']) => {
    if (pending) return;
    const customized = customizeRoutineAnswers(answers, customEquipment, preferredExercises);
    if (customized.equipment.length === 0) { setError('Choose your equipment or add your own below.'); return; }
    setPending(true);
    setError(null);
    try {
      await onGenerate(context ? { ...customized, context } : customized);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setPending(false);
    }
  };

  return (
    <dialog ref={dialog} className="intake-overlay" aria-labelledby="intake-title" onCancel={event => { event.preventDefault(); if (!pending) onClose(); }}>
      {mode === 'quiz' ? <WorkoutQuiz answers={answers} setAnswers={setAnswers} customEquipment={customEquipment} setCustomEquipment={setCustomEquipment} preferredExercises={preferredExercises} setPreferredExercises={setPreferredExercises} pending={pending} error={error} onGenerate={generate} onSkip={() => { setMode('quick'); setError(null); }} onClose={onClose}/> : <form
        onSubmit={handleSubmit}
        className="cloud-dialog intake-form w-full max-w-md max-h-full overflow-y-auto space-y-4 rounded-3xl border border-[#d5e0e8] bg-white p-6 shadow-[0_12px_40px_rgba(30,58,82,0.12)]"
      >
        <h2 id="intake-title" className="text-xl font-semibold text-slate-900">Generate a workout</h2>

        <label className="block space-y-1 text-sm text-slate-700">
          <span>Goal</span>
          <select
            value={answers.goal}
            onChange={(e) => setAnswers({ ...answers, goal: e.target.value })}
            className={fieldClass}
          >
            {GOALS.map((goal) => <option key={goal}>{goal}</option>)}
          </select>
        </label>

        <label className="block space-y-1 text-sm text-slate-700">
          <span>Experience</span>
          <select
            value={answers.experience}
            onChange={(e) => setAnswers({ ...answers, experience: e.target.value })}
            className={fieldClass}
          >
            {EXPERIENCE.map((level) => <option key={level}>{level}</option>)}
          </select>
        </label>

        <label className="block space-y-1 text-sm text-slate-700">
          <span>Today&apos;s focus</span>
          <select
            value={answers.focus}
            onChange={(e) => setAnswers({ ...answers, focus: e.target.value })}
            className={fieldClass}
          >
            {FOCUS.map((focus) => <option key={focus}>{focus}</option>)}
          </select>
        </label>

        <label className="block space-y-1 text-sm text-slate-700">
          <span>Time</span>
          <select
            value={answers.minutes}
            onChange={(e) => setAnswers({ ...answers, minutes: Number(e.target.value) })}
            className={fieldClass}
          >
            {MINUTES.map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
          </select>
        </label>

        <fieldset className="text-sm text-slate-700">
          <legend className="mb-1">Equipment</legend>
          <div className="grid grid-cols-2 gap-1">
            {EQUIPMENT.map((item) => (
              <label key={item} className="flex items-center gap-2 min-h-11">
                <input
                  type="checkbox"
                  checked={answers.equipment.includes(item)}
                  onChange={() => toggleEquipment(item)}
                  className="size-4"
                />
                {item}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block space-y-1 text-sm text-slate-700">
          <span id="custom-equipment-label">Your equipment <span className="intake-optional">(optional)</span></span>
          <input className={fieldClass} type="text" aria-labelledby="custom-equipment-label" value={customEquipment} maxLength={1000} onChange={event => setCustomEquipment(event.target.value)} placeholder="Resistance bands, kettlebell…" aria-describedby="custom-equipment-help" />
          <span id="custom-equipment-help" className="intake-help">Add anything missing above, separated by commas.</span>
        </label>
        <label className="block space-y-1 text-sm text-slate-700">
          <span id="preferred-exercises-label">Exercises you want to include <span className="intake-optional">(optional)</span></span>
          <textarea className="intake-exercises" aria-labelledby="preferred-exercises-label" rows={3} value={preferredExercises} maxLength={1500} onChange={event => setPreferredExercises(event.target.value)} placeholder="Goblet squats, band rows…" aria-describedby="preferred-exercises-help" />
          <span id="preferred-exercises-help" className="intake-help">Use commas or a new line. We'll fit them around your time and equipment, with alternatives when needed.</span>
        </label>

        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-full px-4 py-2.5 text-slate-600 hover:text-slate-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending || (answers.equipment.length === 0 && customItems(customEquipment).length === 0)}
            className="rounded-full bg-slate-900 px-4 py-2.5 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {pending ? 'Generating…' : 'Generate'}
          </button>
        </div>
        <p className="gemini-credit">Powered by Gemini</p>
      </form>}
    </dialog>
  );
}
