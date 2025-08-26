// /src/audio-worklet.js
// Resample from device sampleRate (often 48000) to 16000 PCM16 mono
class PcmCapture16k extends AudioWorkletProcessor {
  constructor() {
    super();
    this.srcRate = sampleRate; // device rate (e.g. 48000)
    this.dstRate = 16000;
    this.ratio = this.srcRate / this.dstRate;
    this.frac = 0;
    this.last = 0;
    this._hasLast = false;

    // Buffer until we collect ~20ms (320 samples @ 16kHz)
    this.buffer = [];
    this.FRAME_SAMPLES = 320; // 20ms @16k
  }

  _resampleTo16k(src) {
    const estimatedOut = Math.floor((src.length + (this._hasLast ? 1 : 0) - this.frac) / this.ratio);
    const out = new Int16Array(Math.max(0, estimatedOut));
    let pos = this.frac;
    let prev = this._hasLast ? this.last : (src.length ? src[0] : 0);

    for (let n = 0; n < out.length; n++) {
      const i = Math.floor(pos);
      const frac = pos - i;

      const s0 = (i === 0) ? prev : src[i - 1];
      const s1 = src[i] !== undefined ? src[i] : (src.length ? src[src.length - 1] : s0);

      const s = s0 + (s1 - s0) * frac;
      const sClamped = Math.max(-1, Math.min(1, s));
      out[n] = (sClamped * 0x7fff) | 0;
      pos += this.ratio;
    }

    const newIndex = Math.floor(pos);
    this.frac = pos - newIndex;

    if (src.length) {
      this.last = src[src.length - 1];
      this._hasLast = true;
    }
    return out;
  }

  process(inputs) {
    const inputChans = inputs[0];
    if (!inputChans || !inputChans[0]) return true;

    const mono = inputChans[0];
    const pcm16 = this._resampleTo16k(mono);

    if (pcm16.length) {
      // append samples to buffer
      this.buffer.push(...pcm16);

      // send out frames of FRAME_SAMPLES (320)
      while (this.buffer.length >= this.FRAME_SAMPLES) {
        const chunk = new Int16Array(this.buffer.splice(0, this.FRAME_SAMPLES));
        this.port.postMessage(chunk.buffer, [chunk.buffer]); // transfer
      }
    }
    return true;
  }
}

registerProcessor('pcm-capture', PcmCapture16k);
