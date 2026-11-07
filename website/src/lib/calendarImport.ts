import ICAL from 'ical.js';

export interface BusyInterval {
  start: string;
  end: string;
}

// Safety cap for very old daily repeating events.
const MAX_OCCURRENCES = 5000;

// Reads an .ics export (Google, Apple, Outlook) and returns only when the user
// is busy between `from` and `to`. Event names and details are discarded.
// All-day events are skipped because they're usually birthdays or reminders.
export function parseIcsBusy(text: string, from: Date, to: Date): BusyInterval[] {
  const calendar = new ICAL.Component(ICAL.parse(text));

  for (const timezone of calendar.getAllSubcomponents('vtimezone')) {
    ICAL.TimezoneService.register(timezone);
  }

  const components = calendar.getAllSubcomponents('vevent');
  const events = components
    .filter((c) => !c.hasProperty('recurrence-id'))
    .map((c) => new ICAL.Event(c));

  // Single changed occurrences of a repeating event, like a moved class.
  for (const exception of components.filter((c) => c.hasProperty('recurrence-id'))) {
    const uid = exception.getFirstPropertyValue('uid');
    events.find((event) => event.uid === uid)?.relateException(exception);
  }

  const busy: BusyInterval[] = [];
  const add = (start: Date, end: Date) => {
    if (end > from && start < to) busy.push({ start: start.toISOString(), end: end.toISOString() });
  };

  for (const event of events) {
    const status = String(event.component.getFirstPropertyValue('status') ?? '').toUpperCase();
    const transparency = String(event.component.getFirstPropertyValue('transp') ?? '').toUpperCase();
    if (status === 'CANCELLED' || transparency === 'TRANSPARENT' || event.startDate.isDate) continue;

    if (!event.isRecurring()) {
      add(event.startDate.toJSDate(), event.endDate.toJSDate());
      continue;
    }

    const occurrences = event.iterator();
    for (let i = 0, next = occurrences.next(); next && i < MAX_OCCURRENCES; i++, next = occurrences.next()) {
      if (next.toJSDate() >= to) break;
      const details = event.getOccurrenceDetails(next);
      add(details.startDate.toJSDate(), details.endDate.toJSDate());
    }
  }

  return busy;
}
