import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('GEMINI_API_KEY environment variable is not defined.');
}

export const ai = new GoogleGenAI({ apiKey });

// gemini-2.5-flash returns 404 for new API keys. 3.5-flash answered in ~5s in
// testing; 3.8-flash took 18-93s, which is too slow for an interactive button.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
