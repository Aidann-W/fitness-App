'use client';
import { useEffect, useState } from 'react';
import { summarizeWorkouts, formatSet } from '@/lib/history';
import { activityDate } from '@/lib/activity';
import type { LoggedSet } from '@/lib/types';

export default function WorkoutHistory({ logs, range, onRange, selectedDate, onClear }: { logs: LoggedSet[]; range: string; onRange: (range: string) => void; selectedDate: string | null; onClear: () => void }) {
  const [limit, setLimit] = useState(5);
  useEffect(() => setLimit(5), [range, selectedDate]);
  const workouts = summarizeWorkouts(logs);
  const dayLabel = selectedDate ? activityDate(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : null;
  return <section className="activity-history compact-history" aria-labelledby="workout-history-title">
    <div className="history-heading"><div><h2 id="workout-history-title">{dayLabel ? 'Workouts on this day' : 'Workout history'}</h2><p>{dayLabel ?? workouts.length + (workouts.length === 1 ? ' workout in this range' : ' workouts in this range')}</p></div><label><span className="sr-only">Workout history range</span><select value={selectedDate ? 'day' : range} onChange={event => onRange(event.target.value)}>{selectedDate && <option value="day">Selected day</option>}<option value="3">Last 3 days</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 3 months</option><option value="all">All history</option></select></label>{selectedDate && <button className="clear-history-date" onClick={onClear}>Clear date</button>}</div>
    {workouts.length === 0 ? <p className="history-empty">{selectedDate ? 'No sets logged on this day.' : 'No workouts in this range. Try a longer range or log your first set.'}</p> : <div className="history-list">{workouts.slice(0, limit).map(workout => <details className="workout-history-item" key={workout.sessionId}><summary><span className="history-date">{new Date(workout.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}<small>{workout.setCount} {workout.setCount === 1 ? 'set' : 'sets'}</small></span><span className="history-exercises">{workout.exercises.join(', ')}</span><span className="history-disclosure" aria-hidden="true">+</span></summary><div className="history-set-list">{logs.filter(log => log.session_id === workout.sessionId).sort((a, b) => a.exercise_name.localeCompare(b.exercise_name) || a.set_index - b.set_index).map((log, index) => <div key={log.exercise_name + ':' + log.set_index + ':' + index}><span>{log.exercise_name}<small>Set {log.set_index + 1}</small></span><strong>{formatSet(log)}</strong></div>)}</div></details>)}</div>}
    {workouts.length > limit && <button className="history-more" onClick={() => setLimit(value => value + 5)}>Show more ({workouts.length - limit} remaining)</button>}
  </section>;
}
