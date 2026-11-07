import { NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { generateWithFallback } from '@/lib/gemini';
import {
  plannerSlots,
  validateSlots,
  type PlanDay,
  type PlannedSlot,
  type SchedulePrefs,
} from '@/lib/schedule';
import { isSignedIn } from '@/lib/supabase';

const scheduleSchema = {
  type: Type.OBJECT,
  properties: {
    sessions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          date: { type: Type.STRING },
          start: { type: Type.STRING },
          reason: { type: Type.STRING },
        },
        required: ['date', 'start', 'reason'],
      },
    },
  },
  required: ['sessions'],
};

// POST /api/plan-schedule - Suggest gym times around the user's busy times.
// Every suggestion is checked here, and the built-in planner fills any gap,
// so the user still gets a schedule when Gemini is down.
export async function POST(req: Request) {
  if (!(await isSignedIn(req))) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const { days, prefs, count } = (await req.json()) as {
    days: PlanDay[];
    prefs: SchedulePrefs;
    count: number;
  };

  if (
    !Array.isArray(days) || days.length === 0 || days.length > 14 ||
    !Number.isInteger(count) || count < 1 || count > 7 ||
    !(prefs?.minutes >= 15 && prefs.minutes <= 240)
  ) {
    return NextResponse.json({ error: 'Invalid schedule request' }, { status: 400 });
  }

  let fromGemini: PlannedSlot[] = [];
  try {
    const response = await generateWithFallback(
      JSON.stringify({
        sessionsNeeded: count,
        sessionMinutes: prefs.minutes,
        gymOpens: prefs.earliest,
        gymCloses: prefs.latest,
        preferredTimeOfDay: prefs.timeOfDay,
        userNotes: String(prefs.notes ?? '').slice(0, 300),
        days,
      }),
      {
        responseMimeType: 'application/json',
        responseSchema: scheduleSchema,
        systemInstruction:
          'You plan gym sessions for a week. Times are 24-hour HH:MM in the user\'s local time. ' +
          'Choose `sessionsNeeded` sessions, at most one per day, using only dates from `days`. ' +
          'Each session lasts `sessionMinutes`, must fit between gymOpens and gymCloses, and must ' +
          'leave at least 15 minutes before and after every busy block. Spread sessions across the ' +
          'week, avoid back-to-back days when you can, and follow the preferred time of day and the ' +
          "user's notes. Give each one a short reason in one sentence.",
      }
    );
    const suggestions = JSON.parse(response.text ?? '').sessions ?? [];
    fromGemini = validateSlots(suggestions, days, prefs, count);
  } catch (error) {
    console.error('Plan schedule error:', error);
  }

  const sessions = [...fromGemini, ...plannerSlots(days, prefs, count, fromGemini)];
  return NextResponse.json({ sessions });
}
