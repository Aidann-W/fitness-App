export interface ClockSelection { start: string; end: string; nextDay: boolean; }
export function clockMinutes(value: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
}
export const clockValue = (minutes: number) => { const value = ((Math.round(minutes) % 1440) + 1440) % 1440; return String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0'); };
export function clockLabel(value: string) {
  const minutes = clockMinutes(value);
  if (minutes === null) return 'Choose time';
  return (Math.floor(minutes / 60) % 12 || 12) + ':' + String(minutes % 60).padStart(2, '0') + (minutes >= 720 ? ' PM' : ' AM');
}
export function rangeMinutes(range: ClockSelection): number | null {
  const start = clockMinutes(range.start), end = clockMinutes(range.end);
  if (start === null || end === null) return null;
  const duration = end + (range.nextDay ? 1440 : 0) - start;
  return duration > 0 && duration <= 1440 ? duration : null;
}
export function minutesOnDial(x: number, y: number, previous: number) {
  const turn = (Math.atan2(x, -y) + Math.PI * 2) % (Math.PI * 2);
  const minute = Math.round(turn / (Math.PI * 2) * 720 / 5) * 5 % 720;
  // Pick the nearest half-day so dragging through noon preserves continuity.
  const candidates = [-720, 0, 720, 1440, 2160].map(offset => minute + offset);
  const nearest = candidates.reduce((best, next) => Math.abs(next - previous) < Math.abs(best - previous) ? next : best);
  return ((nearest % 1440) + 1440) % 1440;
}
export function clockPoint(minutes: number, radius = 108) {
  const angle = minutes / 720 * Math.PI * 2;
  return { x: 160 + Math.sin(angle) * radius, y: 160 - Math.cos(angle) * radius };
}
export function rangeArc(start: number, duration: number) {
  const from = clockPoint(start), end = clockPoint(start + Math.min(duration, 720));
  if (duration >= 720) { const opposite = clockPoint(start + 360); return 'M ' + from.x + ' ' + from.y + ' A 108 108 0 1 1 ' + opposite.x + ' ' + opposite.y + ' A 108 108 0 1 1 ' + from.x + ' ' + from.y; }
  return 'M ' + from.x + ' ' + from.y + ' A 108 108 0 ' + (duration > 360 ? 1 : 0) + ' 1 ' + end.x + ' ' + end.y;
}
// Interpret the chosen wall-clock times on the session's local calendar day.
export function sessionRangeDates(day: string, range: ClockSelection) {
  if (rangeMinutes(range) === null) return null;
  const start = new Date(day + 'T' + range.start + ':00');
  const endDay = new Date(day + 'T12:00:00');
  if (range.nextDay) endDay.setDate(endDay.getDate() + 1);
  const minute = clockMinutes(range.end)!;
  const end = new Date(endDay.getFullYear(), endDay.getMonth(), endDay.getDate(), Math.floor(minute / 60), minute % 60);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return null;
  const matches = (date: Date, clock: string) => date.getHours() * 60 + date.getMinutes() === clockMinutes(clock);
  // Reject a local time that doesn't exist during a daylight-saving change.
  return matches(start, range.start) && matches(end, range.end) ? { start, end } : null;
}
