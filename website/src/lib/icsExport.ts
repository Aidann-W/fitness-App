import type { GymSession } from './schedule';

// 2026-11-09T13:00:00.000Z -> 20261109T130000Z
const icsTime = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

const escapeText = (text: string) =>
  text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

const DETAILS = 'Planned with CumulusFit.';

// A calendar file that Google Calendar, Apple Calendar and Outlook can import.
export function buildIcs(sessions: GymSession[]) {
  const stamp = icsTime(new Date().toISOString());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CumulusFit//Gym Schedule//EN',
    'CALSCALE:GREGORIAN',
    ...sessions.flatMap((session) => [
      'BEGIN:VEVENT',
      `UID:${session.id}@cumulusfit`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsTime(session.starts_at)}`,
      `DTEND:${icsTime(session.ends_at)}`,
      `SUMMARY:${escapeText(session.title)}`,
      `DESCRIPTION:${escapeText(DETAILS)}`,
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
  ];
  return lines.join('\r\n') + '\r\n';
}

// Opens Google Calendar with the event filled in. Needs no sign-in to our app.
export function googleCalendarLink(session: GymSession) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: session.title,
    dates: `${icsTime(session.starts_at)}/${icsTime(session.ends_at)}`,
    details: DETAILS,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function downloadFile(filename: string, text: string, type = 'text/calendar') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
