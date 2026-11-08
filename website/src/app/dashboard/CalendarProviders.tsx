import Image from 'next/image';
const providers = [['google-calendar.svg', 'Google Calendar'], ['apple-calendar.svg', 'Apple Calendar'], ['outlook.svg', 'Outlook']] as const;
export default function CalendarProviders() {
  return <div className="calendar-providers" aria-label="Supported calendars">{providers.map(([file, name]) => <span key={file}><Image src={'/calendar-brands/' + file} width={28} height={28} alt="" unoptimized/><span>{name}</span></span>)}</div>;
}
