// gemini.js
import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const SYSTEM_PROMPT = `
You are "Rev", Revolt Motors' official assistant.
Only talk about Revolt Motors: products (RV400 etc.), pricing, booking, test rides, showrooms, after-sales, app features.
Politely refuse anything unrelated and redirect to Revolt topics.
`;

export async function createLiveSession(onMessage, onError) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY missing in environment");
  }

  const session = await ai.live.connect({
    model: "gemini-2.0-flash-live-001",
    config: {
      responseModalities: [Modality.AUDIO, Modality.TEXT],
      systemInstruction: SYSTEM_PROMPT,
    },
    callbacks: {
      onopen: () => console.log(" Gemini session opened"),
      onmessage: (msg) => {
        console.log("Gemini raw message:", JSON.stringify(msg, null, 2));
        onMessage?.(msg);
      },
      onerror: (err) => {
        console.error(" Gemini error:", err);
        onError?.(err);
      },
      onclose: (ev) => {
        console.log("Gemini session closed:", ev && ev.reason ? ev.reason : ev);
      },
    },
  });

  return session;
}
