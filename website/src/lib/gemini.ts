import { GoogleGenAI, Type, type GenerateContentConfig } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('GEMINI_API_KEY environment variable is not defined.');
}

export const ai = new GoogleGenAI({ apiKey });

// gemini-2.5-flash returns 404 for new API keys. 3.5-flash answered in ~5s in
// testing; 3.8-flash took 18-93s, which is too slow for an interactive button.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite';

const TIMEOUT_MS = 12_000;

function generate(model: string, contents: string, config: GenerateContentConfig) {
  return ai.models.generateContent({
    model,
    contents,
    config: { ...config, abortSignal: AbortSignal.timeout(TIMEOUT_MS) },
  });
}

// The main model returns 503 under high demand, so retry once on the lighter model.
export async function generateWithFallback(contents: string, config: GenerateContentConfig) {
  try {
    return await generate(GEMINI_MODEL, contents, config);
  } catch (error) {
    console.warn(`${GEMINI_MODEL} failed, falling back to ${GEMINI_FALLBACK_MODEL}:`, error);
    return generate(GEMINI_FALLBACK_MODEL, contents, config);
  }
}

export const exerciseSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    sets: { type: Type.INTEGER },
    reps: { type: Type.STRING },
    rest_seconds: { type: Type.INTEGER },
    notes: { type: Type.STRING },
  },
  required: ['name', 'sets', 'reps', 'rest_seconds', 'notes'],
};
