import { NextResponse } from 'next/server';
import { ai } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const { answers } = await req.json();

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Design an athletic gym routine based on: ${JSON.stringify(answers)}`,
      config: {
        responseMimeType: 'application/json',
        systemInstruction: `You are an elite strength coach. Return strictly a JSON object matching this schema:
{
  "title": string,
  "description": string,
  "exercises": [
    {
      "name": string,
      "sets": number,
      "reps": string,
      "rest_seconds": number,
      "notes": string
    }
  ]
}`
      }
    });

    const routine = JSON.parse(response.text || '{}');
    return NextResponse.json(routine);
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate routine', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}