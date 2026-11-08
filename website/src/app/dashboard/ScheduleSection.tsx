'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import { deleteGymSession, fetchSchedule, planSchedule, saveGymSession } from '@/lib/api';
import { parseIcsBusy, type BusyInterval } from '@/lib/calendarImport';
import { fetchGoogleBusy, googleCalendarEnabled } from '@/lib/googleCalendar';
import { buildIcs, downloadFile, googleCalendarLink } from '@/lib/icsExport';
import {
  availablePlanDays,
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
import AvailabilityCalendar from './AvailabilityCalendar';
import CalendarProviders from './CalendarProviders';
import ClockRangePicker from './ClockRangePicker';
import { sessionRangeDates, type ClockSelection } from '@/lib/clockRange';
import './ScheduleSection.css';

const PREFS_KEY = 'cumulusfit.schedulePrefs';
const DRAFTS_KEY = 'cumulusfit.scheduleDrafts';
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
  const [selectedDay, setSelectedDay] = useState(0);
  const [busy, setBusy] = useState<StoredBusy | null>(null);
  const [prefs, setPrefs] = useState<SchedulePrefs>(DEFAULT_PREFS);
  const [sessions, setSessions] = useState<GymSession[]>([]);
  const [drafts, setDraftState] = useState<PlannedSlot[]>([]);
  const setDrafts = (next: PlannedSlot[]) => {
    setDraftState(next);
    writeJson(DRAFTS_KEY, next);
  };
  const [planning, setPlanning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = [today];
    while (days.length < DAYS_SHOWN) days.push(nextDay(days[days.length - 1]));
    setWeek(days);

    const storedPrefs = { ...DEFAULT_PREFS, ...readJson<SchedulePrefs>(PREFS_KEY) };
    setDraftState((readJson<PlannedSlot[]>(DRAFTS_KEY) ?? []).filter(slot => days.some(day => dateKey(day) === slot.date) && (storedPrefs.availableDates === undefined || storedPrefs.availableDates.includes(slot.date))));
    setBusy(readJson<StoredBusy>(BUSY_KEY));
    setPrefs(storedPrefs);
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
    setDrafts([]);
    setMessage(null);
  };

  const storeBusy = (next: StoredBusy | null) => {
    setBusy(next);
    writeJson(BUSY_KEY, next);
    setDrafts([]);
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
      const openDays = availablePlanDays(week.filter((day) => sessionsOn(day).length === 0).map(planDay), prefs);
      if (openDays.length === 0) { setMessage('Choose an available day without a gym session to plan another workout.'); return; }
      const { sessions: planned } = await planSchedule(openDays, prefs, needed);
      setDrafts(planned);
      if (planned[0]) {
        const firstDay = week.findIndex((day) => dateKey(day) === planned[0].date);
        if (firstDay >= 0) setSelectedDay(firstDay);
      }
      if (planned.length < needed) {
        setMessage(`Found ${planned.length} of ${needed} sessions on your available days. Choose more dates, shorten sessions, or widen gym hours.`);
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

  const changeTimeRange = async (session: GymSession, range: ClockSelection) => {
    const dates = sessionRangeDates(dateKey(new Date(session.starts_at)), range);
    if (!dates) throw new Error('That time is not available on this date. Try another start or finish time.');
    return save({ ...session, starts_at: dates.start.toISOString(), ends_at: dates.end.toISOString() }, session);
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

  const availableDates = prefs.availableDates === undefined ? week.map(dateKey) : week.map(dateKey).filter(date => prefs.availableDates!.includes(date));
  const viewDate = (date: string) => { const index = week.findIndex(day => dateKey(day) === date); if (index >= 0) setSelectedDay(index); };

  return <section id="schedule" className="schedule-workspace schedule-redesign">
    <div className="schedule-agenda panel">
      <div className="section-title"><div><p className="eyebrow">NEXT SEVEN DAYS</p><h2>Your gym calendar</h2></div><span className="calendar-count">{weekSessions.length} {weekSessions.length === 1 ? 'session' : 'sessions'}</span></div>
      <div className="calendar-week" role="group" aria-label="Choose a day">{week.map((day, index) => <button type="button" key={dateKey(day)} aria-pressed={selectedDay === index} onClick={() => setSelectedDay(index)}><span>{day.toLocaleDateString(undefined, { weekday: 'short' })}</span><strong>{day.getDate()}</strong><small aria-hidden="true">{sessionsOn(day).length || drafts.some(slot => slot.date === dateKey(day)) ? '●' : '·'}</small></button>)}</div>
      {message && <p role="status" className="schedule-message">{message}</p>}
      {drafts.length > 0 && <div className="schedule-suggestions"><div><strong>{drafts.length} {drafts.length === 1 ? 'suggested session' : 'suggested sessions'}</strong><p>Review the times before adding them.</p></div><div><button onClick={() => setDrafts([])}>Discard</button><button className="schedule-primary" onClick={keepDrafts}>Add to my schedule</button></div></div>}
      <div className="day-agenda">{week.filter((_, index) => index === selectedDay).map(day => {
        const key = dateKey(day), busyToday = clipToDay(day, busy?.blocks ?? []), daySessions = sessionsOn(day), dayDrafts = drafts.filter(slot => slot.date === key);
        return <div key={key} className="agenda-day"><div className="agenda-date-heading"><div><p>{day.toLocaleDateString(undefined, { weekday: 'long' })}</p><h3>{day.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</h3></div><button className="schedule-add" disabled={planning} onClick={() => addSession(day)} aria-label={'Add session on ' + key}>+ Add session</button></div>
          {busyToday.length === 0 && daySessions.length === 0 && dayDrafts.length === 0 && <div className="agenda-empty"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="8" y="10" width="32" height="30" rx="8"/><path d="M8 20h32M17 6v8M31 6v8m-13 16 4 4 8-9" strokeLinecap="round" strokeLinejoin="round"/></svg><h4>A little room in your day.</h4><p>Add a session or pick your available dates to plan the week.</p></div>}
          <ul className="agenda-events" aria-label={key + ' schedule'}>
            {busyToday.map((block, index) => <li key={'busy-'+index} className="agenda-event busy-event"><div className="event-time"><strong>{timeLabel(localDate(key, block.start))}</strong><span>{timeLabel(localDate(key, block.end))}</span></div><div className="event-content"><span className="event-kind">Imported calendar</span><h4>Busy</h4><p>Time reserved for another commitment.</p></div></li>)}
            {daySessions.map(session => <li key={session.id} className="agenda-event gym-event"><div className="event-time"><strong>{timeLabel(new Date(session.starts_at))}</strong><span>{timeLabel(new Date(session.ends_at))}</span></div><div className="event-content"><span className="event-kind">{session.source === 'ai' ? 'Planned session' : 'Gym session'}</span><h4>{session.title}</h4><ClockRangePicker start={clockOf(new Date(session.starts_at))} end={clockOf(new Date(session.ends_at))} nextDay={dateKey(new Date(session.ends_at)) !== dateKey(new Date(session.starts_at))} disabled={planning} label={'Edit ' + key + ' session time'} onSave={range => changeTimeRange(session, range)}/><div className="event-actions"><a href={googleCalendarLink(session)} target="_blank" rel="noopener noreferrer">Add to Google Calendar</a><button className="schedule-remove" disabled={planning} onClick={() => removeSession(session)} aria-label={'Remove ' + key + ' session'}>Remove</button></div></div></li>)}
            {dayDrafts.map(slot => <li key={'draft-'+slot.date} className="agenda-event suggested-event"><div className="event-time"><strong>{timeLabel(localDate(slot.date, slot.start))}</strong><span>{timeLabel(localDate(slot.date, slot.end))}</span></div><div className="event-content"><span className="event-kind">Suggested workout</span><h4>A time for you</h4><p>{slot.reason}</p>{slot.from === 'planner' && <small>Found by the built-in planner</small>}</div></li>)}
          </ul>
        </div>;
      })}</div>
      <div className="calendar-export"><div><h3>Take your week with you</h3><p>Export {weekSessions.length} {weekSessions.length === 1 ? 'session' : 'sessions'} to your calendar.</p><CalendarProviders/></div><button className="schedule-secondary" onClick={exportWeek} disabled={weekSessions.length === 0}>Download .ics</button></div>
      <p className="schedule-buffer">Sessions leave {BUFFER_MINUTES} minutes around busy times for getting to and from the gym.</p>
    </div>
    <aside className="schedule-sidebar"><div className="schedule-settings">
      <section className="schedule-settings-card availability-card"><div className="settings-card-heading"><span className="settings-step">01</span><div><h3>Your availability</h3><p>Highlight the dates you can train.</p></div></div>
        <AvailabilityCalendar dates={week.map(dateKey)} selected={availableDates} busyDates={week.filter(day => clipToDay(day, busy?.blocks ?? []).length > 0).map(dateKey)} sessionDates={week.filter(day => sessionsOn(day).length > 0 || drafts.some(slot => slot.date === dateKey(day))).map(dateKey)} disabled={planning} onChange={dates => updatePrefs({ availableDates: dates })} onView={viewDate}/>
        <details className="session-preferences"><summary>Session preferences <span>{prefs.minutes} min · {prefs.daysPerWeek}/week</span></summary><fieldset disabled={planning} className="preference-fields"><label>Workouts per week<select value={prefs.daysPerWeek} onChange={event => updatePrefs({ daysPerWeek: Number(event.target.value) })} className={fieldClass}>{[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}</option>)}</select></label><label>Session length<select value={prefs.minutes} onChange={event => updatePrefs({ minutes: Number(event.target.value) })} className={fieldClass}>{[15,30,45,60,75,90,120].map(n => <option key={n} value={n}>{n} min</option>)}</select></label><label>Gym opens<input type="time" value={prefs.earliest} onChange={event => event.target.value && updatePrefs({ earliest: event.target.value })} className={fieldClass}/></label><label>Gym closes<input type="time" value={prefs.latest} onChange={event => event.target.value && updatePrefs({ latest: event.target.value })} className={fieldClass}/></label><label className="preference-wide">Best time of day<select value={prefs.timeOfDay} onChange={event => updatePrefs({ timeOfDay: event.target.value as TimeOfDay })} className={fieldClass}>{TIMES_OF_DAY.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="preference-wide">Anything else? (optional)<input type="text" maxLength={300} placeholder="Rest days or other preferences" value={prefs.notes} onChange={event => updatePrefs({ notes: event.target.value })} className={fieldClass}/></label></fieldset></details>
        <button className="schedule-primary plan-week-button" onClick={handlePlan} disabled={planning || week.length === 0 || availableDates.length === 0}>{planning ? 'Planning your week…' : 'Find workout times'}</button><p className="planner-credit">Powered by Gemini · falls back to the built-in planner</p>
      </section>
      <section className="schedule-settings-card import-card"><div className="settings-card-heading"><span className="settings-step">02</span><div><h3>Bring in your calendar</h3><p>Plan around the commitments you already have.</p></div></div><CalendarProviders/><p className="import-privacy">Only busy times are imported; event titles are left out. Busy times stay saved on this device and are used when planning.</p><div className="calendar-import-actions"><label className="schedule-secondary">Upload .ics file<input aria-label="Upload calendar file" type="file" accept=".ics,text/calendar" onChange={handleIcsFile} disabled={planning} className="sr-only"/></label>{googleCalendarEnabled && <button className="schedule-secondary" disabled={planning} onClick={handleGoogle}>Connect Google Calendar</button>}</div><p className="calendar-import-status">{busy ? 'Using ' + busy.source : 'Export an .ics file from your calendar, then upload it here.'}{busy && <button disabled={planning} onClick={() => storeBusy(null)}>Clear calendar</button>}</p></section>
    </div></aside>
  </section>;
}
