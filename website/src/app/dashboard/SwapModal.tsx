'use client';

import { useState, type FormEvent } from 'react';
import type { Exercise } from '@/lib/types';

interface Props {
  exercise: Exercise;
  onSwap: (reason: string) => Promise<void>;
  onClose: () => void;
}

export default function SwapModal({ exercise, onSwap, onClose }: Props) {
  const [reason, setReason] = useState('The equipment is taken');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await onSwap(reason);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="swap-title"
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 bg-slate-900 border border-slate-700 rounded-2xl p-6"
      >
        <h2 id="swap-title" className="text-xl font-bold text-white">Swap {exercise.name}</h2>

        <label className="block text-sm text-slate-300 space-y-1">
          <span>What&apos;s the problem?</span>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white"
          />
        </label>

        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="px-4 py-2.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-lg transition"
          >
            {pending ? 'Finding a swap…' : 'Find a swap'}
          </button>
        </div>
      </form>
    </div>
  );
}
