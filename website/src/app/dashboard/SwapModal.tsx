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
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/30 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="swap-title"
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-3xl border border-[#d5e0e8] bg-white p-6 shadow-[0_12px_40px_rgba(30,58,82,0.12)]"
      >
        <h2 id="swap-title" className="text-xl font-semibold text-slate-900">Swap {exercise.name}</h2>

        <label className="block space-y-1 text-sm text-slate-700">
          <span>What&apos;s the problem?</span>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900"
          />
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
            disabled={pending}
            className="rounded-full bg-slate-900 px-4 py-2.5 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {pending ? 'Finding a swap…' : 'Find a swap'}
          </button>
        </div>
      </form>
    </div>
  );
}
