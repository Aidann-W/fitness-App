'use client';
import { useEffect, useState } from 'react';
import { activityDayKey, activityDate } from '@/lib/activity';

interface Props { dates: string[]; selected: string[]; busyDates: string[]; sessionDates: string[]; disabled: boolean; onChange: (dates: string[]) => void; onView: (date: string) => void; }
export default function AvailabilityCalendar({ dates, selected, busyDates, sessionDates, disabled, onChange, onView }: Props) {
  const [month, setMonth] = useState<Date | null>(null);
  const first = dates[0], last = dates.at(-1);
  useEffect(() => { if (first) { const date = activityDate(first); setMonth(new Date(date.getFullYear(), date.getMonth(), 1)); } }, [first]);
  if (!month || !first || !last) return <p role="status">Loading available dates…</p>;
  const firstDay = activityDate(first), lastDay = activityDate(last);
  const minMonth = new Date(firstDay.getFullYear(), firstDay.getMonth(), 1), maxMonth = new Date(lastDay.getFullYear(), lastDay.getMonth(), 1);
  const start = new Date(month.getFullYear(), month.getMonth(), 1 - month.getDay());
  const cells = Math.ceil((month.getDay() + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) / 7) * 7;
  const choose = (next: string[]) => { onChange(next); if (next[0]) onView(next[0]); };
  return <div className="availability-calendar">
    <div className="availability-shortcuts"><button disabled={disabled} onClick={() => choose([first])}>Today</button><button disabled={disabled || dates.length < 2} onClick={() => choose([dates[1]])}>Tomorrow</button><button disabled={disabled} onClick={() => choose(dates.filter(date => [0,6].includes(activityDate(date).getDay())))}>This weekend</button><button disabled={disabled} onClick={() => choose(dates)}>Next 7 days</button></div>
    <div className="availability-month"><h4>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h4><div><button aria-label="Previous availability month" disabled={disabled || month <= minMonth} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()-1,1))}>‹</button><button aria-label="Next availability month" disabled={disabled || month >= maxMonth} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()+1,1))}>›</button></div></div>
    <div className="availability-weekdays" aria-hidden="true">{['Su','Mo','Tu','We','Th','Fr','Sa'].map(day => <span key={day}>{day}</span>)}</div>
    <div className="availability-days" role="group" aria-label="Available workout dates">{Array.from({ length: cells }, (_, index) => {
      const date = new Date(start); date.setDate(start.getDate()+index); const key = activityDayKey(date), eligible = dates.includes(key), available = selected.includes(key), busy = busyDates.includes(key), session = sessionDates.includes(key);
      return <button key={key} type="button" disabled={disabled || !eligible} aria-pressed={available && eligible} aria-label={date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) + (available && eligible ? ', available' : ', not selected') + (busy ? ', busy times imported' : '') + (session ? ', gym session planned' : '')} data-outside={date.getMonth() !== month.getMonth()} onClick={() => { onChange(available ? selected.filter(day => day !== key) : [...selected,key].sort()); onView(key); }}><span>{date.getDate()}</span><span className="availability-markers" aria-hidden="true">{busy && <i className="busy-marker"/>}{session && <i className="session-marker"/>}</span></button>;
    })}</div>
    <div className="availability-legend"><span><i className="busy-marker"/>Busy time</span><span><i className="session-marker"/>Gym session</span></div>
    <div className="availability-summary"><span>{selected.length} {selected.length === 1 ? 'day' : 'days'} available</span><button disabled={disabled || selected.length === 0} onClick={() => onChange([])}>Clear selection</button></div>
    <p className="availability-window">Choose dates from {firstDay.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}–{lastDay.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}. Only highlighted dates are used for planning.</p>
  </div>;
}
