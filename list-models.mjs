import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const models = await ai.models.list();
for (const m of models) {
  const name = m.name || '';
  if (name.includes('image') || name.includes('flash') || name.includes('pro')) {
    console.log(name, '|', m.displayName || '');
  }
}
