// /src/app.js
let ws, mediaStream, audioContext, workletNode, silentGain;
let wsQueue = [];

const statusEl = document.getElementById("status");
const logEl = document.getElementById("log");
const audioEl = document.getElementById("player");
const btnStart = document.getElementById("start");
const btnStop = document.getElementById("stop");
const btnInterrupt = document.getElementById("interrupt");

function log(msg) {
  const d = document.createElement("div");
  d.textContent = msg;
  logEl.prepend(d);
}

//fixed sendWS (no recursion)
function sendWS(obj) {
  const s = (typeof obj === "string") ? obj : JSON.stringify(obj);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(s);   // actually send to server
  } else {
    wsQueue.push(s); // store until socket is open
  }
}

const wsURL = () =>
  (location.protocol === "https:" ? "wss" : "ws") +
  "://" + location.hostname + ":8080/ws";

async function setupAudioWorklet() {
  audioContext = new AudioContext();
  await audioContext.audioWorklet.addModule("/src/audio-worklet.js");
  workletNode = new AudioWorkletNode(audioContext, "pcm-capture");

  // Ensure processor runs by connecting to silent gain
  silentGain = audioContext.createGain();
  silentGain.gain.value = 0;
  workletNode.connect(silentGain).connect(audioContext.destination);

  // Tell server we’ll send 16k PCM
  sendWS({ type: "rate", value: 16000 });

  workletNode.port.onmessage = (e) => {
    const bytes = new Uint8Array(e.data);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    sendWS({ type: "audio", data: btoa(binary) });
  };
}

function pcmToWav(pcmBytes, sampleRate, channels, bitsPerSample) {
  const dataSize = pcmBytes.byteLength;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function wstr(ofs, str) {
    for (let i = 0; i < str.length; i++) view.setUint8(ofs + i, str.charCodeAt(i));
  }
  function wu32(ofs, val) { view.setUint32(ofs, val, true); }
  function wu16(ofs, val) { view.setUint16(ofs, val, true); }

  wstr(0, "RIFF");
  wu32(4, 36 + dataSize);
  wstr(8, "WAVE");
  wstr(12, "fmt ");
  wu32(16, 16);
  wu16(20, 1);
  wu16(22, channels);
  wu32(24, sampleRate);
  wu32(28, sampleRate * channels * bitsPerSample / 8);
  wu16(32, channels * bitsPerSample / 8);
  wu16(34, bitsPerSample);
  wstr(36, "data");
  wu32(40, dataSize);
  new Uint8Array(buffer, 44).set(pcmBytes);
  return buffer;
}

export async function startApp() {
  btnStart.onclick = async () => {
    statusEl.textContent = "connecting…";
    ws = new WebSocket(wsURL());

    window._ws = ws; // for debugging in console

    ws.onopen = async () => {
      statusEl.textContent = "connected";
      btnStart.disabled = true; btnStop.disabled = false; btnInterrupt.disabled = false;

      // flush queued messages
      while (wsQueue.length) ws.send(wsQueue.shift());

      await setupAudioWorklet();

      // test message so Gemini replies
      sendWS({
        type: "text",
        text: "Hello Gemini, tell me about Revolt RV400"
      });

      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const micSource = audioContext.createMediaStreamSource(mediaStream);
        micSource.connect(workletNode);
        log("🎤 Microphone enabled — streaming 16k PCM to server");
      } catch (err) {
        log("Mic error: " + err.message);
      }
    };

    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);

      if (msg.type === "text") {
        const text = (msg.parts || []).map(p => p.text || "").join(" ");
        if (text) log("Rev: " + text);
      }

      if (msg.type === "audio") {
        const pcm = Uint8Array.from(atob(msg.data), c => c.charCodeAt(0));
        const wavBuf = pcmToWav(pcm, 24000, 1, 16);
        const blob = new Blob([wavBuf], { type: "audio/wav" });
        audioEl.src = URL.createObjectURL(blob);
        audioEl.play().catch(() => {});
      }

      if (msg.type === "error") {
        log("Error from server: " + msg.error);
      }
    };

    ws.onerror = (e) => {
      console.error("WS error", e);
      statusEl.textContent = "ws error";
    };

    ws.onclose = () => {
      statusEl.textContent = "disconnected";
      btnStart.disabled = false; btnStop.disabled = true; btnInterrupt.disabled = true;
      log("WebSocket disconnected");
    };
  };

  btnInterrupt.onclick = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      sendWS({ type: "interrupt" }); //  fixed (not string)
    }
    if (audioEl) { audioEl.pause(); audioEl.currentTime = 0; }
  };

  btnStop.onclick = () => {
    try { mediaStream?.getTracks().forEach(t => t.stop()); } catch {}
    try { ws?.close(); } catch {}
    statusEl.textContent = "stopped";
    btnStart.disabled = false; btnStop.disabled = true; btnInterrupt.disabled = true;
  };
}
