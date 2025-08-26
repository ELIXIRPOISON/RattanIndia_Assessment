// test_live.js
import WebSocket from "ws";

const API_KEY = process.env.GEMINI_API_KEY;
const url = `wss://generativelanguage.googleapis.com/v1beta/live:connect?key=${API_KEY}`;

const ws = new WebSocket(url);

ws.on("open", () => {
  console.log("✅ Connected to Gemini Live API");

  // Send initial setup
  ws.send(JSON.stringify({
    setup: {
      model: "gemini-2.0-flash-live-001",
      responseModalities: ["TEXT"],
      systemInstruction: {
        parts: [{ text: "You are a helpful assistant." }]
      }
    }
  }));

  // Send a simple text prompt
  ws.send(JSON.stringify({
    input: {
      text: "Hello Gemini, can you hear me?"
    }
  }));
});

ws.on("message", (data) => {
  console.log("📩 Gemini message:", data.toString());
});

ws.on("close", (code, reason) => {
  console.error(`❎ Closed (code ${code}): ${reason.toString()}`);
});

ws.on("error", (err) => {
  console.error("❌ Error:", err);
});
