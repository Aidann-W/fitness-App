'use client';

import { useState, type FormEvent } from 'react';
import { createAccount, logIn } from '@/lib/account';

const fieldClass = 'w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white';

interface Props {
  onSignedIn: () => void;
  onClose: () => void;
}

export default function AccountModal({ onSignedIn, onClose }: Props) {
  const [mode, setMode] = useState<'create' | 'login'>('create');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState(false);

  const creating = mode === 'create';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      if (!creating) {
        await logIn(email, password);
        onSignedIn();
      } else if (await createAccount(email, password)) {
        setConfirmEmail(true);
        setPending(false);
      } else {
        onSignedIn();
      }
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
        aria-labelledby="account-title"
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 bg-slate-900 border border-slate-700 rounded-2xl p-6"
      >
        <h2 id="account-title" className="text-xl font-bold text-white">
          {creating ? 'Save your progress' : 'Log in'}
        </h2>

        {confirmEmail ? (
          <p role="status" className="text-sm text-slate-300">
            Check {email} for a confirmation link to finish creating your account.
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-400">
              {creating
                ? 'Create an account to keep your workouts and use them on any device.'
                : "Workouts done on this device without an account won't move to your account."}
            </p>

            <label className="block text-sm text-slate-300 space-y-1">
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldClass}
              />
            </label>

            <label className="block text-sm text-slate-300 space-y-1">
              <span>Password</span>
              <input
                type="password"
                autoComplete={creating ? 'new-password' : 'current-password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={fieldClass}
              />
            </label>

            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}

            <button
              type="button"
              onClick={() => {
                setMode(creating ? 'login' : 'create');
                setError(null);
              }}
              className="min-h-11 text-sm text-blue-400 hover:text-blue-300"
            >
              {creating ? 'Already have an account? Log in' : 'New here? Create an account'}
            </button>
          </>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="px-4 py-2.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-50"
          >
            {confirmEmail ? 'Close' : 'Cancel'}
          </button>
          {!confirmEmail && (
            <button
              type="submit"
              disabled={pending}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-lg transition"
            >
              {pending ? 'Please wait…' : creating ? 'Create account' : 'Log in'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
