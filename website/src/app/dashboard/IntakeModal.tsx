'use client';

import { useState, type FormEvent } from 'react';
import type { RoutineAnswers } from '@/lib/types';

const GOALS = ['Strength', 'Muscle building', 'General fitness'];
const EXPERIENCE = ['Beginner', 'Intermediate'];
const EQUIPMENT = ['Barbell', 'Dumbbells', 'Bench', 'Squat rack', 'Cable machine', 'Leg press', 'Pull-up bar', 'Bodyweight only'];
const MINUTES = [15, 30, 45, 60];
const FOCUS = ['Full body', 'Upper body', 'Lower body', 'Push', 'Pull'];

const fieldClass = 'w-full h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900';

interface Props {
  onGenerate: (answers: RoutineAnswers) => Promise<void>;
  onClose: () => void;
}

export default function IntakeModal({ onGenerate, onClose }: Props) {
  const [answers, setAnswers] = useState<RoutineAnswers>({
    goal: GOALS[1],
    experience: EXPERIENCE[0],
    equipment: ['Dumbbells', 'Bench'],
    minutes: 45,
    focus: FOCUS[0],
  });
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
    setPending(true);
    setError(null);
    try {
      await onGenerate(answers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center cloud-overlay bg-slate-900/30 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="intake-title"
        onSubmit={handleSubmit}
        className="cloud-dialog w-full max-w-md max-h-full overflow-y-auto space-y-4 rounded-3xl border border-[#d5e0e8] bg-white p-6 shadow-[0_12px_40px_rgba(30,58,82,0.12)]"
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
            disabled={pending || answers.equipment.length === 0}
            className="rounded-full bg-slate-900 px-4 py-2.5 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {pending ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </form>
    </div>
  );
}
