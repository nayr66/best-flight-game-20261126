// DAWNLINE — synthesised sound, no audio files: an engine that follows the
// throttle, wind that follows the speed, and small voices for the events.

export function makeAudio() {
  let ctx = null, engineOsc = null, engineGain = null, windGain = null, started = false;

  function start() {
    if (started) return;
    started = true;
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass'; engineFilter.frequency.value = 420;
    engineGain = ctx.createGain(); engineGain.gain.value = 0.0;
    engineOsc.connect(engineFilter).connect(engineGain).connect(ctx.destination);
    engineOsc.start();

    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let seed = 7;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 16807) % 2147483647;
      data[i] = (seed / 2147483647) * 2 - 1;
    }
    const wind = ctx.createBufferSource();
    wind.buffer = noiseBuffer; wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass'; windFilter.frequency.value = 700; windFilter.Q.value = 0.6;
    windGain = ctx.createGain(); windGain.gain.value = 0.0;
    wind.connect(windFilter).connect(windGain).connect(ctx.destination);
    wind.start();
  }

  function blip(freq, seconds, gain, type = 'sine') {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + seconds);
    osc.connect(g).connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + seconds);
  }

  return {
    start,
    update(state) {
      if (!ctx) return;
      const rpm = state.crashed ? 0 : 0.25 + state.throttle * 0.75;
      engineOsc.frequency.value = 48 + rpm * 95;
      engineGain.gain.value = state.crashed ? 0 : 0.05 + state.throttle * 0.11;
      windGain.gain.value = Math.min(0.16, state.speed / 62 * 0.16);
    },
    ring() { blip(880, 0.35, 0.12); setTimeout(() => blip(1320, 0.3, 0.09), 90); },
    touchdown(hard) { blip(hard ? 70 : 110, 0.25, hard ? 0.3 : 0.14, 'triangle'); },
    crash() { blip(45, 0.9, 0.4, 'sawtooth'); },
    complete() { [660, 880, 1100].forEach((f, i) => setTimeout(() => blip(f, 0.4, 0.11), i * 130)); },
    warning() { blip(1560, 0.12, 0.06, 'square'); },
  };
}
