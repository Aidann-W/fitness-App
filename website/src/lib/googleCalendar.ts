import type { BusyInterval } from './calendarImport';

// Optional. Without a Google OAuth client ID the app only offers .ics import.
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

// Availability only. The app never sees event names or details.
const SCOPE = 'https://www.googleapis.com/auth/calendar.freebusy';

export const googleCalendarEnabled = CLIENT_ID !== '';

interface TokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface TokenClient {
  requestAccessToken: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (error: { type: string }) => void;
          }): TokenClient;
        };
      };
    };
  }
}

function loadGoogleScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.google?.accounts) return resolve();
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Google sign-in.'));
    document.head.appendChild(script);
  });
}

function requestToken() {
  return new Promise<string>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (response) =>
        response.access_token
          ? resolve(response.access_token)
          : reject(new Error(response.error_description ?? 'Google did not share your calendar.')),
      error_callback: (error) =>
        reject(new Error(error.type === 'popup_closed' ? 'Google sign-in was closed.' : 'Could not open Google sign-in.')),
    });
    client.requestAccessToken();
  });
}

export async function fetchGoogleBusy(from: Date, to: Date): Promise<BusyInterval[]> {
  await loadGoogleScript();
  const token = await requestToken();

  const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      items: [{ id: 'primary' }],
    }),
  });
  if (!res.ok) throw new Error('Google Calendar did not return your availability.');

  const body = await res.json();
  const primary = body.calendars?.primary;
  if (!primary || primary.errors?.length) {
    throw new Error('Google Calendar did not return your availability.');
  }
  return primary.busy as BusyInterval[];
}
