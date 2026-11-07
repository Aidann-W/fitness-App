'use client';
import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getAccount, logOut, type Account } from '@/lib/account';
import { deleteRoutine, fetchRoutines, fetchSetLogs, generateRoutine, saveRoutine, swapExercise, updateRoutine, } from '@/lib/api';
import { lastSetsByExercise, summarizeWorkouts } from '@/lib/history';
import { starterPresets } from '@/lib/mockData';
import { BUSY_KEY } from '@/lib/schedule';
import { readJson, writeJson } from '@/lib/storage';
import type { ActiveSession, Exercise, LoggedSet, RoutineAnswers, WorkoutRoutine, } from '@/lib/types';
import AccountModal from './AccountModal';
import IntakeModal from './IntakeModal';
import SwapModal from './SwapModal';
const ROUTINES_KEY = 'cumulusfit.routines';
const SESSION_KEY = 'cumulusfit.activeSession';
const LOGS_KEY = 'cumulusfit.setLogs';
const SELECTED_KEY = 'cumulusfit.selectedRoutine';
const AUTOSAVE_DELAY_MS = 600;
export const blankExercise: Exercise = { name: '', sets: 3, reps: '10', rest_seconds: 60, notes: '' };
// A workout tracks sets by exercise name, so names must be filled in and unique.
export const canStart = (routine: WorkoutRoutine) => {
    const names = routine.exercises.map((exercise) => exercise.name.trim());
    return names.length > 0 && names.every(Boolean) && new Set(names).size === names.length;
};
// Presets and unsaved routines have no row in Supabase to update.
export const isStored = (routine: WorkoutRoutine) => Boolean(routine.id) && !starterPresets.some((preset) => preset.id === routine.id);
function useWorkoutState() {
    const router = useRouter();
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
    const lastSets = useMemo(() => lastSetsByExercise(logs, session?.sessionId), [logs, session?.sessionId]);
    const recentWorkouts = useMemo(() => summarizeWorkouts(logs).slice(0, 5), [logs]);
    const loadLogs = async () => {
        try {
            const saved = await fetchSetLogs();
            writeJson(LOGS_KEY, saved);
            setLogs(saved);
        }
        catch (err) {
            console.error('Failed to load workout history:', err);
            setLogs(readJson<LoggedSet[]>(LOGS_KEY) ?? []);
        }
    };
    // Fetch the user's saved routines on load. Presets are always available.
    useEffect(() => {
        // The user can build or generate a routine before this finishes, so keep
        // anything created meanwhile and don't change what they have open.
        const showLoaded = (loaded: WorkoutRoutine[]) => {
            setRoutines((prev) => [
                ...prev.filter((r) => !loaded.some((l) => l.id === r.id)),
                ...loaded,
            ]);
            setSelectedRoutine((current) => {
                const selected = readJson<WorkoutRoutine>(SELECTED_KEY);
                return current ?? loaded.find((r) => r.id === selected?.id) ?? (selected && !isStored(selected) ? selected : null) ?? loaded[0] ?? starterPresets[0];
            });
        };
        async function loadRoutines() {
            try {
                const saved = await fetchRoutines();
                writeJson(ROUTINES_KEY, saved);
                showLoaded(saved);
            }
            catch (err) {
                console.error('Failed to load routines:', err);
                const cached = readJson<WorkoutRoutine[]>(ROUTINES_KEY) ?? [];
                showLoaded(cached);
                setNotice(cached.length > 0
                    ? "Can't reach the cloud. Showing the routines saved on this device."
                    : 'Could not load your saved routines. Showing presets only.');
            }
            finally {
                setLoading(false);
            }
        }
        setSession(readJson<ActiveSession>(SESSION_KEY));
        // Routines load first because that is what starts the anonymous session.
        loadRoutines().then(() => getAccount()).then(setAccount);
        loadLogs();
    }, []);
    useEffect(() => {
        if (selectedRoutine)
            writeJson(SELECTED_KEY, selectedRoutine);
    }, [selectedRoutine]);
    const openRoutine = (routine: WorkoutRoutine) => {
        setSelectedRoutine(routine);
        router.push('/training');
    };
    const buildRoutine = () => {
        editRoutine({ title: 'My Workout', description: '', exercises: [blankExercise] });
        router.push('/training');
    };
    // Autosave once typing pauses.
    useEffect(() => {
        if (!pendingSave)
            return;
        const timer = setTimeout(async () => {
            try {
                await updateRoutine(pendingSave);
            }
            catch (err) {
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
        if (!window.confirm(`Delete "${routine.title}"? Your logged sets will be kept.`))
            return;
        try {
            setPendingSave(null);
            await deleteRoutine(routine.id!);
            const next = routines.filter((r) => r.id !== routine.id);
            writeJson(ROUTINES_KEY, next);
            setRoutines(next);
            setSelectedRoutine(next[0] ?? starterPresets[0]);
        }
        catch (err) {
            console.error('Failed to delete routine:', err);
            setNotice('Could not delete that routine. Please try again.');
        }
    };
    const reloadAfterAccountChange = () => {
        [ROUTINES_KEY, LOGS_KEY, SESSION_KEY, BUSY_KEY, SELECTED_KEY, 'cumulusfit.scheduleDrafts'].forEach((key) => writeJson(key, null));
        window.location.reload();
    };
    const handleLogOut = async () => {
        try {
            await logOut();
            reloadAfterAccountChange();
        }
        catch (err) {
            console.error('Failed to log out:', err);
            setNotice('Could not log out. Please try again.');
        }
    };
    const updateSession = (update: (prev: ActiveSession) => ActiveSession) => {
        setSession((prev) => {
            if (!prev)
                return prev;
            const next = update(prev);
            writeJson(SESSION_KEY, next);
            return next;
        });
    };
    const startWorkout = (routine: WorkoutRoutine) => {
        if (session) {
            router.push('/training');
            return;
        }
        const next: ActiveSession = {
            sessionId: crypto.randomUUID(),
            routineId: isStored(routine) ? routine.id! : null,
            routine,
            sets: {},
            restEndsAt: null,
        };
        writeJson(SESSION_KEY, next);
        setSession(next);
        router.push('/training');
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
        if (!swapRoutine || swapIndex === null)
            return;
        const others = swapRoutine.exercises
            .filter((_, i) => i !== swapIndex)
            .map((exercise) => exercise.name);
        const replacement: Exercise = await swapExercise(swapRoutine.exercises[swapIndex], others, reason);
        const exercises = [...swapRoutine.exercises];
        exercises[swapIndex] = replacement;
        const updated = { ...swapRoutine, exercises };
        if (session) {
            updateSession((prev) => ({ ...prev, routine: updated }));
        }
        else {
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
        }
        catch (err) {
            console.error('Failed to save routine:', err);
            setRoutines((prev) => [generated, ...prev]);
            setSelectedRoutine(generated);
            setNotice('Your workout was generated but not saved. It will be lost if you refresh.');
        }
        setShowIntake(false);
        router.push('/training');
    };
    const handleExerciseChange = <K extends keyof Exercise>(index: number, field: K, value: Exercise[K]) => {
        if (!selectedRoutine)
            return;
        const updatedExercises = [...selectedRoutine.exercises];
        updatedExercises[index] = { ...updatedExercises[index], [field]: value };
        editRoutine({ ...selectedRoutine, exercises: updatedExercises });
    };
    const removeExercise = (index: number) => {
        if (!selectedRoutine)
            return;
        editRoutine({
            ...selectedRoutine,
            exercises: selectedRoutine.exercises.filter((_, i) => i !== index),
        });
    };
    return { routines, loading, selectedRoutine, session, logs, lastSets, recentWorkouts, account,
        notice, showIntake, showAccount, swapIndex, swapRoutine, setShowIntake, setShowAccount, setSwapIndex,
        editRoutine, openRoutine, buildRoutine, handleDeleteRoutine, handleLogOut, reloadAfterAccountChange,
        updateSession, startWorkout, finishWorkout, handleSwap, handleGenerate, handleExerciseChange, removeExercise };
}
const WorkoutContext = createContext<ReturnType<typeof useWorkoutState> | null>(null);
export function useWorkouts() {
    const value = useContext(WorkoutContext);
    if (!value)
        throw new Error('Workout pages require WorkoutProvider');
    return value;
}
const navigation = [
    ['/dashboard', 'Dashboard'], ['/training', 'Training'], ['/routines', 'My routines'],
    ['/activity', 'Activity'], ['/schedule', 'Schedule'],
] as const;
export default function WorkoutProvider({ children }: {
    children: ReactNode;
}) {
    const state = useWorkoutState();
    const pathname = usePathname();
    const { account, session, notice, showIntake, showAccount, swapIndex, swapRoutine, setShowAccount, setShowIntake, setSwapIndex, handleLogOut, handleGenerate, handleSwap, reloadAfterAccountChange } = state;
    return (<WorkoutContext.Provider value={state}>
      <div className="cloud-app min-h-screen font-sans text-slate-800">
        <a href="#page-content" className="skip-link">Skip to content</a>
        <header className="cloud-header">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
            <Link href="/dashboard" className="brand" aria-label="CumulusFit dashboard">
              <span className="brand-mark"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M9 23h15a6 6 0 0 0 .3-12 8.5 8.5 0 0 0-16-1A6.5 6.5 0 0 0 9 23Z" stroke="currentColor" strokeWidth="1.8"/><path d="m13 18 3-5 3 5m-3-5v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
              <span>Cumulus<span className="brand-fit">Fit</span><small>Your strength, one session at a time.</small></span>
            </Link>
            <nav className="cloud-nav" aria-label="Main navigation">
              {navigation.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined}>{label}</Link>)}
            </nav>
            <div className="account-actions flex items-center gap-2">
              {account && (account.isAnonymous ? (<button onClick={() => setShowAccount(true)} className="min-h-11 rounded-full px-4 text-sm font-medium text-[#3d6d8c] hover:bg-[#e7eef3]">Save your progress</button>) : <><span className="account-email text-sm text-slate-500">{account.email}</span><button onClick={handleLogOut} className="min-h-11 rounded-full px-4 text-sm font-medium text-[#3d6d8c] hover:bg-[#e7eef3]">Log out</button></>)}
            </div>
          </div>
        </header>
        <main id="page-content" className="mx-auto w-full max-w-6xl flex-1 space-y-7 px-5 py-8 sm:px-8" tabIndex={-1}>
          {notice && <p role="status" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{notice}</p>}
          {session && pathname !== '/training' && pathname !== '/dashboard' && <div className="resume-banner"><div><strong>Workout in progress</strong><p>{session.routine.title}</p></div><Link href="/training" className="button-primary">Resume workout <span aria-hidden="true">↗</span></Link></div>}
          {children}
        </main>
        <footer className="cloud-footer"><span>CumulusFit</span><small>Built at HackRPI 2026</small></footer>
        {showIntake && <IntakeModal onGenerate={handleGenerate} onClose={() => setShowIntake(false)}/>}
        {showAccount && <AccountModal onSignedIn={reloadAfterAccountChange} onClose={() => setShowAccount(false)}/>}
        {swapIndex !== null && swapRoutine && <SwapModal exercise={swapRoutine.exercises[swapIndex]} onSwap={handleSwap} onClose={() => setSwapIndex(null)}/>}
      </div>
    </WorkoutContext.Provider>);
}
