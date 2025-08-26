import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { createLiveSession } from './gemini.js';

const app = express();
app.use(cors());
app.use(express.static('.'));
app.use('/src', express.static('./'));
app.get('/health', (_, res) => res.json({ ok: true }));

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', async (browserWS) => {
  console.log(' New browser connection');
  let session;
  let inputRate = 16000;

  try {
    session = await createLiveSession(
      (msg) => {
        // Forward Gemini messages to browser
        if (msg.data) {
          try {
            browserWS.send(JSON.stringify({ type: 'audio', data: msg.data }));
          } catch (e) { console.error(e); }
        }

        if (msg.serverContent?.modelTurn?.parts) {
          try {
            browserWS.send(JSON.stringify({
              type: 'text',
              parts: msg.serverContent.modelTurn.parts,
            }));
          } catch (e) { console.error(e); }
        }

        if (msg.serverContent?.turnComplete) {
          try { browserWS.send(JSON.stringify({ type: 'turnComplete' })); } catch {}
        }
      },
      (err) => {
        console.error(" Gemini error callback:", err);
        try { browserWS.send(JSON.stringify({ type: 'error', error: String(err) })); } catch {}
      }
    );

    console.log(' Gemini session opened');
  } catch (e) {
    console.error("Session creation failed:", e);
    browserWS.send(JSON.stringify({ type: 'error', error: String(e) }));
    browserWS.close();
    return;
  }

  browserWS.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === 'rate') {
        inputRate = Number(msg.value) || 16000;
        console.log(" Browser input rate:", inputRate);
        return;
      }

      if (msg.type === 'audio') {
        console.log(" Forwarding audio to Gemini (length):", msg.data.length);
        await session.sendRealtimeInput({
          audio: { data: msg.data, mimeType: `audio/pcm;rate=${inputRate}` }
        });
        return;
      }

      if (msg.type === 'text') {
        console.log(" Forwarding text to Gemini:", msg.text);
        await session.sendRealtimeInput({ text: msg.text });
        return;
      }

      if (msg.type === 'interrupt') {
        console.log(" Interrupt received from browser");
        try { browserWS.send(JSON.stringify({ type: 'ack', ok: true })); } catch {}
        return;
      }

      console.warn("Unknown message type from browser:", msg.type);
    } catch (e) {
      console.error(" Error handling browser message:", e);
      try { browserWS.send(JSON.stringify({ type: 'error', error: String(e) })); } catch {}
    }
  });

  browserWS.on('close', async () => {
    console.log("Browser WS closed — closing Gemini session");
    try { await session?.close?.(); } catch (e) { console.error(e); }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(` Server running at http://localhost:${PORT}`));
