'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import { deleteGymSession, fetchSchedule, planSchedule, saveGymSession } from '@/lib/api';
import { parseIcsBusy, type BusyInterval } from '@/lib/calendarImport';
import { fetchGoogleBusy, googleCalendarEnabled } from '@/lib/googleCalendar';
import { buildIcs, downloadFile, googleCalendarLink } from '@/lib/icsExport';
import {
  BUFFER_MINUTES,
  BUSY_KEY,
  firstFreeStart,
  toClock,
  toMinutes,
  type ClockRange,
  type GymSession,
  type PlanDay,
  type PlannedSlot,
  type SchedulePrefs,
  type TimeOfDay,
} from '@/lib/schedule';
import { readJson, writeJson } from '@/lib/storage';

const PREFS_KEY = 'cumulusfit.schedulePrefs';
const DAYS_SHOWN = 7;
const SESSION_TITLE = 'Gym session';

const DEFAULT_PREFS: SchedulePrefs = {
  daysPerWeek: 3,
  minutes: 60,
  earliest: '06:00',
  latest: '22:00',
  timeOfDay: 'any',
  notes: '',
};

const TIMES_OF_DAY: [TimeOfDay, string][] = [
  ['any', 'Any time'],
  ['morning', 'Morning'],
  ['afternoon', 'Afternoon'],
  ['evening', 'Evening'],
];

interface StoredBusy {
  source: string;
  blocks: BusyInterval[];
}

const fieldClass = 'mt-1 block h-11 w-full rounded-xl border border-slate-300 bg-[#f4f8fb] px-3 text-sm text-slate-900';

const pad = (n: number) => String(n).padStart(2, '0');
const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const clockOf = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
// A date and time with no offset is read as local time.
const localDate = (date: string, clock: string) => new Date(`${date}T${clock}:00`);
const nextDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
const timeLabel = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

// The parts of each interval that fall on this calendar day, as local clock times.
function clipToDay(day: Date, intervals: BusyInterval[]): ClockRange[] {
  const dayStart = day.getTime();
  const dayEnd = nextDay(day).getTime();

  return intervals.flatMap((interval) => {
    const start = Math.max(new Date(interval.start).getTime(), dayStart);
    const end = Math.min(new Date(interval.end).getTime(), dayEnd);
    if (end <= start) return [];
    return [{
      start: toClock(Math.round((start - dayStart) / 60000)),
      end: toClock(Math.min(Math.round((end - dayStart) / 60000), 24 * 60 - 1)),
    }];
  });
}

export default function ScheduleSection() {
  // Set after mount: the page is prerendered, so "today" must come from the browser.
  const [week, setWeek] = useState<Date[]>([]);
  const [busy, setBusy] = useState<StoredBusy | null>(null);
  const [prefs, setPrefs] = useState<SchedulePrefs>(DEFAULT_PREFS);
  const [sessions, setSessions] = useState<GymSession[]>([]);
  const [drafts, setDrafts] = useState<PlannedSlot[]>([]);
  const [planning, setPlanning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = [today];
    while (days.length < DAYS_SHOWN) days.push(nextDay(days[days.length - 1]));
    setWeek(days);

    setBusy(readJson<StoredBusy>(BUSY_KEY));
    setPrefs({ ...DEFAULT_PREFS, ...readJson<SchedulePrefs>(PREFS_KEY) });
    fetchSchedule()
      .then(setSessions)
      .catch((err) => {
        console.error('Failed to load schedule:', err);
        setMessage('Could not load your saved schedule.');
      });
  }, []);

  const weekStart = week[0];
  const weekEnd = week.length ? nextDay(week[week.length - 1]) : undefined;

  const updatePrefs = (changes: Partial<SchedulePrefs>) => {
    const next = { ...prefs, ...changes };
    setPrefs(next);
    writeJson(PREFS_KEY, next);
  };

  const storeBusy = (next: StoredBusy | null) => {
    setBusy(next);
    writeJson(BUSY_KEY, next);
  };

  const sessionsOn = (day: Date) =>
    sessions.filter((s) => dateKey(new Date(s.starts_at)) === dateKey(day));

  // Everything the planner must avoid on this day: imported busy times, gym
  // sessions already planned, and for today, the time that has already passed.
  const planDay = (day: Date): PlanDay => {
    const blocked = clipToDay(day, [
      ...(busy?.blocks ?? []),
      ...sessions.map((s) => ({ start: s.starts_at, end: s.ends_at })),
    ]);
    if (dateKey(day) === dateKey(new Date())) {
      const now = new Date();
      blocked.push({ start: '00:00', end: toClock(now.getHours() * 60 + now.getMinutes()) });
    }
    return { date: dateKey(day), busy: blocked };
  };

  const handleIcsFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !weekStart || !weekEnd) return;

    try {
      const blocks = parseIcsBusy(await file.text(), weekStart, weekEnd);
      storeBusy({ source: file.name, blocks });
      setDrafts([]);
      setMessage(`Found ${blocks.length} busy time(s) this week in ${file.name}.`);
    } catch (err) {
      console.error('Failed to read calendar file:', err);
      setMessage("Couldn't read that file. Export your calendar as .ics and try again.");
    }
  };

  const handleGoogle = async () => {
    if (!weekStart || !weekEnd) return;
    try {
      const blocks = await fetchGoogleBusy(weekStart, weekEnd);
      storeBusy({ source: 'Google Calendar', blocks });
      setDrafts([]);
      setMessage(`Found ${blocks.length} busy time(s) this week in Google Calendar.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not connect to Google Calendar.');
    }
  };

  const daysWithSessions = week.filter((day) => sessionsOn(day).length > 0).length;
  const needed = prefs.daysPerWeek - daysWithSessions;

  const handlePlan = async () => {
    setMessage(null);
    if (needed <= 0) {
      setMessage(`You already have ${daysWithSessions} gym day(s) planned this week.`);
      return;
    }

    setPlanning(true);
    try {
      const openDays = week.filter((day) => sessionsOn(day).length === 0).map(planDay);
      const { sessions: planned } = await planSchedule(openDays, prefs, needed);
      setDrafts(planned);
      if (planned.length < needed) {
        setMessage(`Only ${planned.length} of ${needed} session(s) fit around your week. Try longer gym hours or shorter sessions.`);
      } else if (planned.some((slot) => slot.from === 'planner')) {
        setMessage('Gemini was busy, so some times come from the built-in planner.');
      }
    } catch (err) {
      console.error('Failed to plan schedule:', err);
      setMessage('Could not plan your week. Please try again.');
    } finally {
      setPlanning(false);
    }
  };

  const putSession = (id: string, session: GymSession | undefined) =>
    setSessions((prev) =>
      [...prev.filter((s) => s.id !== id), ...(session ? [session] : [])].sort((a, b) =>
        a.starts_at.localeCompare(b.starts_at)
      )
    );

  // Shows the change right away and undoes it if Supabase rejects it.
  // `previous` is the session before an edit; leave it out for new sessions.
  const save = async (session: GymSession, previous?: GymSession) => {
    putSession(session.id, session);
    try {
      await saveGymSession(session);
      return true;
    } catch (err) {
      console.error('Failed to save gym session:', err);
      putSession(session.id, previous);
      setMessage('A change to your schedule could not be saved. Please try again.');
      return false;
    }
  };

  const keepDrafts = async () => {
    const toSave = drafts.map((slot) => ({
      id: crypto.randomUUID(),
      title: SESSION_TITLE,
      starts_at: localDate(slot.date, slot.start).toISOString(),
      ends_at: localDate(slot.date, slot.end).toISOString(),
      source: 'ai' as const,
    }));
    setDrafts([]);
    const saved = await Promise.all(toSave.map((session) => save(session)));
    // Anything that failed goes back to being a suggestion so it isn't lost.
    setDrafts(drafts.filter((_, i) => !saved[i]));
  };

  const addSession = (day: Date) => {
    const free = firstFreeStart(planDay(day), prefs);
    const start = free ?? toMinutes(prefs.earliest);
    const startsAt = localDate(dateKey(day), toClock(start));
    save({
      id: crypto.randomUUID(),
      title: SESSION_TITLE,
      starts_at: startsAt.toISOString(),
      ends_at: new Date(startsAt.getTime() + prefs.minutes * 60000).toISOString(),
      source: 'manual',
    });
  };

  const changeTime = (session: GymSession, field: 'start' | 'end', clock: string) => {
    if (!clock) return;
    const day = dateKey(new Date(session.starts_at));
    const startsAt = new Date(session.starts_at);
    const endsAt = new Date(session.ends_at);
    const length = endsAt.getTime() - startsAt.getTime();

    // Moving the start keeps the session length. The end must stay after the start.
    const nextStart = field === 'start' ? localDate(day, clock) : startsAt;
    const nextEnd = field === 'start' ? new Date(nextStart.getTime() + length) : localDate(day, clock);
    if (nextEnd <= nextStart) return;

    save({ ...session, starts_at: nextStart.toISOString(), ends_at: nextEnd.toISOString() }, session);
  };

  const removeSession = async (session: GymSession) => {
    setSessions((prev) => prev.filter((s) => s.id !== session.id));
    try {
      await deleteGymSession(session.id);
    } catch (err) {
      console.error('Failed to remove gym session:', err);
      setSessions((prev) => [...prev, session]);
      setMessage('Could not remove that session. Please try again.');
    }
  };

  const weekSessions = sessions.filter(
    (s) => weekStart && weekEnd && new Date(s.starts_at) >= weekStart && new Date(s.starts_at) < weekEnd
  );

  const exportWeek = () =>
    downloadFile('cumulusfit-gym-schedule.ics', buildIcs(weekSessions));

  return (
    <section id="schedule" className="scroll-mt-6">
      <p className="eyebrow mb-2">PLAN YOUR WEEK</p>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Gym schedule</h2>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[24px] border border-[#d5e0e8] bg-white p-5">
          <h3 className="font-semibold text-slate-900">1. Bring in your calendar</h3>
          <p className="mt-1 text-sm text-slate-500">
            Only busy times are used, never event names. Your calendar stays on this device.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-[#d5e0e8] bg-white px-5 text-sm font-medium text-slate-800 hover:border-[#b7c9d6] focus-within:ring-2 focus-within:ring-[#3d6d8c]">
              Upload .ics file
              <input type="file" accept=".ics,text/calendar" onChange={handleIcsFile} className="sr-only" />
            </label>
            {googleCalendarEnabled && (
              <button
                type="button"
                onClick={handleGoogle}
                className="min-h-11 rounded-full border border-[#d5e0e8] bg-white px-5 text-sm font-medium text-slate-800 hover:border-[#b7c9d6]"
              >
                Connect Google Calendar
              </button>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {busy
              ? `Using ${busy.source}. `
              : 'In Google Calendar: Settings → Import & export → Export, then upload the .ics file. '}
            {busy && (
              <button type="button" onClick={() => storeBusy(null)} className="font-medium text-[#3d6d8c] underline">
                Clear
              </button>
            )}
          </p>
        </div>

        <div className="rounded-[24px] border border-[#d5e0e8] bg-white p-5">
          <h3 className="font-semibold text-slate-900">2. Tell us what works</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500">
            <label>
              Days per week
              <select
                value={prefs.daysPerWeek}
                onChange={(e) => updatePrefs({ daysPerWeek: Number(e.target.value) })}
                className={fieldClass}
              >
                {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label>
              Session length
              <select
                value={prefs.minutes}
                onChange={(e) => updatePrefs({ minutes: Number(e.target.value) })}
                className={fieldClass}
              >
                {[30, 45, 60, 75, 90].map((n) => <option key={n} value={n}>{n} min</option>)}
              </select>
            </label>
            <label>
              Gym opens
              <input
                type="time"
                value={prefs.earliest}
                onChange={(e) => e.target.value && updatePrefs({ earliest: e.target.value })}
                className={fieldClass}
              />
            </label>
            <label>
              Gym closes
              <input
                type="time"
                value={prefs.latest}
                onChange={(e) => e.target.value && updatePrefs({ latest: e.target.value })}
                className={fieldClass}
              />
            </label>
            <label className="col-span-2">
              Best time of day
              <select
                value={prefs.timeOfDay}
                onChange={(e) => updatePrefs({ timeOfDay: e.target.value as TimeOfDay })}
                className={fieldClass}
              >
                {TIMES_OF_DAY.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="col-span-2">
              Anything else? (optional)
              <input
                type="text"
                maxLength={300}
                placeholder="e.g. no gym on Sundays, rest day after legs"
                value={prefs.notes}
                onChange={(e) => updatePrefs({ notes: e.target.value })}
                className={fieldClass}
              />
            </label>
          </div>
          <button
            type="button"
            onClick={handlePlan}
            disabled={planning || week.length === 0}
            className="mt-4 min-h-12 w-full rounded-full bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {planning ? 'Planning your week…' : '3. Plan my week with AI ✧'}
          </button>
        </div>
      </div>

      {message && (
        <p role="status" className="mt-4 rounded-2xl border border-[#d5e0e8] bg-white/80 p-3 text-sm text-slate-700">
          {message}
        </p>
      )}

      {drafts.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-[#3d6d8c] bg-[#eef4f9] p-3">
          <p className="text-sm text-slate-700">{drafts.length} suggested session(s) are shown below.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDrafts([])}
              className="min-h-11 rounded-full px-4 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={keepDrafts}
              className="min-h-11 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Add to my schedule
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {week.map((day) => {
          const key = dateKey(day);
          const busyToday = clipToDay(day, busy?.blocks ?? []);
          const daySessions = sessionsOn(day);
          const dayDrafts = drafts.filter((slot) => slot.date === key);

          return (
            <div key={key} className="rounded-[24px] border border-[#d5e0e8] bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                {day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </h3>

              <ul className="mt-2 space-y-2" aria-label={`${key} schedule`}>
                {busyToday.map((block, i) => (
                  <li key={`busy-${i}`} className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-500">
                    Busy {timeLabel(localDate(key, block.start))}–{timeLabel(localDate(key, block.end))}
                  </li>
                ))}

                {daySessions.map((session) => (
                  <li key={session.id} className="rounded-xl border border-[#3d6d8c] bg-[#eef4f9] p-3">
                    <p className="text-xs font-semibold text-[#2c496c]">
                      {session.title}{session.source === 'ai' ? ' · planned with AI' : ''}
                    </p>
                    <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                      <input
                        type="time"
                        aria-label={`${key} session start`}
                        value={clockOf(new Date(session.starts_at))}
                        onChange={(e) => changeTime(session, 'start', e.target.value)}
                        className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-1 text-sm text-slate-900"
                      />
                      –
                      <input
                        type="time"
                        aria-label={`${key} session end`}
                        value={clockOf(new Date(session.ends_at))}
                        onChange={(e) => changeTime(session, 'end', e.target.value)}
                        className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-1 text-sm text-slate-900"
                      />
                    </div>
                    <div className="mt-1 flex justify-between">
                      <a
                        href={googleCalendarLink(session)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center text-xs font-medium text-[#3d6d8c] underline"
                      >
                        Add to Google Calendar
                      </a>
                      <button
                        type="button"
                        onClick={() => removeSession(session)}
                        aria-label={`Remove ${key} session`}
                        className="min-h-11 px-2 text-xs text-slate-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}

                {dayDrafts.map((slot) => (
                  <li key={`draft-${slot.date}`} className="rounded-xl border border-dashed border-[#3d6d8c] p-3">
                    <p className="text-xs font-semibold text-[#2c496c]">
                      Suggested {timeLabel(localDate(slot.date, slot.start))}–{timeLabel(localDate(slot.date, slot.end))}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {slot.reason}{slot.from === 'planner' ? ' (built-in planner)' : ''}
                    </p>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => addSession(day)}
                className="mt-2 min-h-11 w-full rounded-xl border border-dashed border-[#b7c9d6] text-xs font-medium text-slate-600 hover:border-[#3d6d8c]"
              >
                + Add session
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[#d5e0e8] bg-white p-4">
        <p className="text-sm text-slate-600">
          Export this week&apos;s {weekSessions.length} session(s) to Google Calendar, Apple Calendar, or Outlook.
        </p>
        <button
          type="button"
          onClick={exportWeek}
          disabled={weekSessions.length === 0}
          className="min-h-11 rounded-full border border-[#d5e0e8] bg-white px-5 text-sm font-medium text-slate-800 hover:border-[#b7c9d6] disabled:opacity-50"
        >
          Download .ics
        </button>
      </div>

      <p className="mt-2 text-xs text-slate-400">
        Sessions leave {BUFFER_MINUTES} minutes around busy times for getting to and from the gym.
      </p>
    </section>
  );
}
