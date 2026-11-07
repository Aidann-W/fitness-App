// Scheduling helpers shared by the browser and the plan-schedule route.
// Planner times are local wall-clock "HH:MM" strings for one calendar day, so
// the server and Gemini never have to deal with time zones.

export type TimeOfDay = 'any' | 'morning' | 'afternoon' | 'evening';

export interface SchedulePrefs {
  daysPerWeek: number;
  minutes: number;
  earliest: string;
  latest: string;
  timeOfDay: TimeOfDay;
  notes: string;
}

export interface GymSession {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  source: 'ai' | 'manual';
}

export interface ClockRange {
  start: string;
  end: string;
}

export interface PlanDay {
  date: string;
  busy: ClockRange[];
}

export interface PlannedSlot {
  date: string;
  start: string;
  end: string;
  reason: string;
  from: 'gemini' | 'planner';
}

// Imported busy times stay on the device. Cleared on log out.
export const BUSY_KEY = 'cumulusfit.busy';

// Time to get to and from the gym around other commitments.
export const BUFFER_MINUTES = 15;

const STEP_MINUTES = 15;

const TIME_OF_DAY_RANGE: Record<TimeOfDay, [number, number]> = {
  any: [0, 24 * 60],
  morning: [5 * 60, 12 * 60],
  afternoon: [12 * 60, 17 * 60],
  evening: [17 * 60, 24 * 60],
};

export const toMinutes = (clock: string) => {
  const [hours, minutes] = clock.split(':').map(Number);
  return hours * 60 + minutes;
};

export const toClock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export function isFree(day: PlanDay, start: number, prefs: SchedulePrefs) {
  const end = start + prefs.minutes;
  if (start < toMinutes(prefs.earliest) || end > toMinutes(prefs.latest)) return false;

  return day.busy.every(
    (block) =>
      end + BUFFER_MINUTES <= toMinutes(block.start) ||
      start >= toMinutes(block.end) + BUFFER_MINUTES
  );
}

// First free start in the preferred part of the day, else anywhere in gym hours.
export function firstFreeStart(day: PlanDay, prefs: SchedulePrefs): number | null {
  const [preferredFrom, preferredTo] = TIME_OF_DAY_RANGE[prefs.timeOfDay];
  const ranges: [number, number][] = [[preferredFrom, preferredTo], [0, 24 * 60]];

  for (const [from, to] of ranges) {
    for (let start = from; start + prefs.minutes <= to; start += STEP_MINUTES) {
      if (isFree(day, start, prefs)) return start;
    }
  }
  return null;
}

// Keeps only suggestions that really fit, at most one per day.
export function validateSlots(
  suggestions: { date: string; start: string; reason: string }[],
  days: PlanDay[],
  prefs: SchedulePrefs,
  count: number
): PlannedSlot[] {
  const valid: PlannedSlot[] = [];

  for (const suggestion of suggestions) {
    if (valid.length === count) break;

    const day = days.find((d) => d.date === suggestion.date);
    if (!day || valid.some((slot) => slot.date === day.date)) continue;
    if (!/^\d{2}:\d{2}$/.test(suggestion.start)) continue;

    const start = toMinutes(suggestion.start);
    if (!isFree(day, start, prefs)) continue;

    valid.push({
      date: day.date,
      start: toClock(start),
      end: toClock(start + prefs.minutes),
      reason: String(suggestion.reason ?? '').slice(0, 160),
      from: 'gemini',
    });
  }
  return valid;
}

// Built-in planner used when Gemini fails or comes up short. Spreads sessions
// out by trying every other day first.
export function plannerSlots(
  days: PlanDay[],
  prefs: SchedulePrefs,
  count: number,
  taken: PlannedSlot[]
): PlannedSlot[] {
  const order = [
    ...days.filter((_, i) => i % 2 === 0),
    ...days.filter((_, i) => i % 2 === 1),
  ];
  const added: PlannedSlot[] = [];

  for (const day of order) {
    if (taken.length + added.length >= count) break;
    if (taken.some((slot) => slot.date === day.date)) continue;

    const start = firstFreeStart(day, prefs);
    if (start === null) continue;

    added.push({
      date: day.date,
      start: toClock(start),
      end: toClock(start + prefs.minutes),
      reason: 'First open time that fits your gym hours.',
      from: 'planner',
    });
  }
  return added;
}
