import { NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { generateWithFallback } from '@/lib/gemini';

const routineSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    exercises: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          sets: { type: Type.INTEGER },
          reps: { type: Type.STRING },
          rest_seconds: { type: Type.INTEGER },
          notes: { type: Type.STRING },
        },
        required: ['name', 'sets', 'reps', 'rest_seconds', 'notes'],
      },
    },
  },
  required: ['title', 'description', 'exercises'],
};

export async function POST(req: Request) {
  try {
    const { answers } = await req.json();

    const response = await generateWithFallback(
      `Design a gym routine based on: ${JSON.stringify(answers)}`,
      {
        responseMimeType: 'application/json',
        responseSchema: routineSchema,
        systemInstruction:
          'You are a strength coach for beginner and intermediate gym users. ' +
          'Only use equipment the user has. Fit the routine to their time limit. ' +
          'Keep notes to one short sentence. ' +
          'Do not give medical, injury, or rehabilitation advice.',
      }
    );

    const routine = JSON.parse(response.text ?? '');
    if (!Array.isArray(routine.exercises) || routine.exercises.length === 0) {
      throw new Error('Gemini returned a routine with no exercises');
    }

    return NextResponse.json(routine);
  } catch (error) {
    console.error('Gemini API Error:', error);
    return NextResponse.json(
      { error: 'Could not generate a routine. Please try again.' },
      { status: 502 }
    );
  }
}
