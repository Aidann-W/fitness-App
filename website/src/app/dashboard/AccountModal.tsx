'use client';

import { useState, type FormEvent } from 'react';
import { createAccount, logIn } from '@/lib/account';

const fieldClass = 'w-full h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900';

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
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/30 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-title"
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-3xl border border-[#d5e0e8] bg-white p-6 shadow-[0_12px_40px_rgba(30,58,82,0.12)]"
      >
        <h2 id="account-title" className="text-xl font-semibold text-slate-900">
          {creating ? 'Save your progress' : 'Log in'}
        </h2>

        {confirmEmail ? (
          <p role="status" className="text-sm text-slate-600">
            Check {email} for a confirmation link to finish creating your account.
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-500">
              {creating
                ? 'Create an account to keep your workouts and use them on any device.'
                : "Workouts done on this device without an account won't move to your account."}
            </p>

            <label className="block space-y-1 text-sm text-slate-700">
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

            <label className="block space-y-1 text-sm text-slate-700">
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

            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

            <button
              type="button"
              onClick={() => {
                setMode(creating ? 'login' : 'create');
                setError(null);
              }}
              className="min-h-11 text-sm font-medium text-[#3d6d8c] hover:text-slate-900"
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
            className="rounded-full px-4 py-2.5 text-slate-600 hover:text-slate-900 disabled:opacity-50"
          >
            {confirmEmail ? 'Close' : 'Cancel'}
          </button>
          {!confirmEmail && (
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-slate-900 px-4 py-2.5 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {pending ? 'Please wait…' : creating ? 'Create account' : 'Log in'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
