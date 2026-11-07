import { NextResponse } from 'next/server';
import { exerciseSchema, generateWithFallback } from '@/lib/gemini';
import { isSignedIn } from '@/lib/supabase';

export async function POST(req: Request) {
  if (!(await isSignedIn(req))) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  try {
    const { exercise, others, reason } = await req.json();

    const response = await generateWithFallback(
      `Replace this exercise: ${JSON.stringify(exercise)}
Why it needs replacing: ${reason}
Already in the workout, so do not pick these: ${JSON.stringify(others)}`,
      {
        responseMimeType: 'application/json',
        responseSchema: exerciseSchema,
        systemInstruction:
          'You are a strength coach. Pick one replacement exercise that trains the same ' +
          'muscles with the same movement pattern and does not need the unavailable equipment. ' +
          'Keep sets, reps, and rest close to the original. ' +
          'Keep notes to one short sentence saying why it is a good match. ' +
          'Do not give medical, injury, or rehabilitation advice.',
      }
    );

    return NextResponse.json(JSON.parse(response.text ?? ''));
  } catch (error) {
    console.error('Exercise swap error:', error);
    return NextResponse.json(
      { error: 'Could not find a replacement. Please try again.' },
      { status: 502 }
    );
  }
}
