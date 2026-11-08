import type { LoggedSet } from './types';
import { poundsLiftedSince } from './history';

export const activityDayKey = (date: Date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
export const activityDate = (key: string) => { const [year, month, day] = key.split('-').map(Number); return new Date(year, month - 1, day); };
export function activityStart(now: Date, days: number) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1);
}
export function activityLogs(logs: LoggedSet[], since: Date, until: Date) {
  return logs.filter(log => { const time = new Date(log.completed_at).getTime(); return time >= since.getTime() && time <= until.getTime(); }).sort((a, b) => b.completed_at.localeCompare(a.completed_at));
}
export const liftedVolume = (logs: LoggedSet[]) => poundsLiftedSince(logs, new Date(0));
export function volumeBuckets(logs: LoggedSet[], now: Date, days: number) {
  const start = activityStart(now, days);
  const count = days === 7 ? 7 : days === 30 ? 6 : days === 90 ? 9 : 12;
  return Array.from({ length: count }, (_, index) => {
    const from = new Date(start); from.setDate(start.getDate() + Math.floor(index * days / count));
    const end = new Date(start); end.setDate(start.getDate() + Math.floor((index + 1) * days / count));
    const bucketLogs = logs.filter(log => { const date = new Date(log.completed_at); return date >= from && date < end && date <= now; });
    return { key: activityDayKey(from), from, end, pounds: liftedVolume(bucketLogs), label: from.toLocaleDateString(undefined, days === 7 ? { weekday: 'short' } : { month: 'short', day: 'numeric' }) };
  });
}
