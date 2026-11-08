'use client';
import { useEffect, useState } from 'react';
import type { LoggedSet } from '@/lib/types';
import { activityDate, activityDayKey } from '@/lib/activity';

export default function WorkoutWeek({ logs, selectedDate, onSelect }: { logs: LoggedSet[]; selectedDate: string | null; onSelect: (day: string) => void }) {
  const [today, setToday] = useState<Date | null>(null);
  const [offset, setOffset] = useState(0);
  useEffect(() => setToday(new Date()), []);
  if (!today) return <div className="week-strip" aria-label="Loading training dates" />;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7) + offset * 7);
  const end = new Date(start); end.setDate(start.getDate() + 6);
  const chooseDate = (value: string) => {
    if (!value || value > activityDayKey(today)) return;
    const date = activityDate(value);
    if (!Number.isFinite(date.getTime()) || activityDayKey(date) !== value) return;
    // Use calendar weeks rather than milliseconds so daylight-saving changes don't shift dates.
    const chosenMonday = new Date(date); chosenMonday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    const thisMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
    setOffset(Math.round((Date.UTC(chosenMonday.getFullYear(), chosenMonday.getMonth(), chosenMonday.getDate()) - Date.UTC(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate())) / (7 * 86400000)));
    onSelect(value);
  };
  return <section className="week-strip interactive-week" aria-label="Browse workout dates">
    <div className="week-label"><strong>{offset === 0 ? 'This week' : 'Past workouts'}</strong><span>{start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span><div className="week-navigation"><button type="button" aria-label="Previous week" onClick={() => setOffset(value => value - 1)}>‹</button><button type="button" aria-label="Next week" disabled={offset === 0} onClick={() => setOffset(value => Math.min(0, value + 1))}>›</button><label><span className="sr-only">Jump to workout date</span><input type="date" max={activityDayKey(today)} value={selectedDate ?? ''} onInput={event => chooseDate(event.currentTarget.value)} onChange={event => chooseDate(event.target.value)} /></label></div></div>
    <div className="week-days">{Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start); day.setDate(start.getDate() + index);
      const key = activityDayKey(day), trained = logs.some(log => activityDayKey(new Date(log.completed_at)) === key), current = key === activityDayKey(today);
      return <button type="button" key={key} className={'week-day' + (current ? ' today' : '')} aria-pressed={selectedDate === key} disabled={key > activityDayKey(today)} aria-label={day.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) + (trained ? ', sets logged' : ', no sets logged') + (current ? ', today' : '')} onClick={() => onSelect(key)}><span>{day.toLocaleDateString(undefined, { weekday: 'short' })}</span><strong>{day.getDate()}</strong><small aria-hidden="true">{trained ? '●' : '·'}</small></button>;
    })}</div>
  </section>;
}
