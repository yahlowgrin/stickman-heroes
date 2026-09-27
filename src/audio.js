// Lightweight procedural audio: background music and sound effects generated
// with the Web Audio API, so the game needs no external audio files.

let ctx = null;
let masterGain = null;
let musicGain = null;
let sfxGain = null;
let muted = false;

function ensureContext() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : 0.5;
    masterGain.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = 1;
    musicGain.connect(masterGain);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 1;
    sfxGain.connect(masterGain);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function isMuted() {
  return muted;
}

export function setMuted(value) {
  muted = value;
  if (masterGain) masterGain.gain.value = muted ? 0 : 0.5;
}

export function toggleMuted() {
  setMuted(!muted);
  return muted;
}

function playTone({ freq, duration = 0.15, type = "square", volume = 1, delay = 0, slideTo = null, bus = "sfx" }) {
  const audioCtx = ensureContext();
  const start = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.linearRampToValueAtTime(slideTo, start + duration);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(bus === "music" ? musicGain : sfxGain);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export const sfx = {
  jump: () => playTone({ freq: 440, duration: 0.12, type: "square", volume: 0.15, slideTo: 660 }),
  coin: () => {
    playTone({ freq: 880, duration: 0.08, type: "square", volume: 0.2 });
    playTone({ freq: 1320, duration: 0.1, type: "square", volume: 0.15, delay: 0.06 });
  },
  hit: () => playTone({ freq: 180, duration: 0.1, type: "sawtooth", volume: 0.2, slideTo: 90 }),
  spike: () => playTone({ freq: 320, duration: 0.15, type: "sawtooth", volume: 0.2, slideTo: 120 }),
  select: () => playTone({ freq: 660, duration: 0.06, type: "square", volume: 0.12 }),
  purchase: () => {
    playTone({ freq: 660, duration: 0.08, type: "triangle", volume: 0.2 });
    playTone({ freq: 990, duration: 0.12, type: "triangle", volume: 0.18, delay: 0.07 });
  },
  victory: () => {
    [523, 659, 784, 1046].forEach((f, i) => playTone({ freq: f, duration: 0.18, type: "triangle", volume: 0.22, delay: i * 0.12 }));
  },
  defeat: () => {
    [392, 349, 311, 261].forEach((f, i) => playTone({ freq: f, duration: 0.28, type: "sawtooth", volume: 0.18, delay: i * 0.16 }));
  },
  levelUp: () => {
    [392, 523, 659, 784].forEach((f, i) => playTone({ freq: f, duration: 0.14, type: "square", volume: 0.2, delay: i * 0.09 }));
  },
};

// --- Background music: a short looping note sequence per scene/theme ---
let musicTimer = null;
let currentTrack = null;

const TRACKS = {
  overworld: { tempo: 0.3, type: "triangle", volume: 0.1, notes: [392, 440, 523, 440, 392, 349, 392, 523] },
  sunny: { tempo: 0.27, type: "triangle", volume: 0.1, notes: [440, 523, 659, 523, 440, 392, 440, 659] },
  dusk: { tempo: 0.34, type: "sawtooth", volume: 0.08, notes: [220, 261, 246, 220, 196, 220, 261, 293] },
  battle: { tempo: 0.16, type: "square", volume: 0.12, notes: [220, 220, 261, 220, 293, 261, 220, 196] },
  hub: { tempo: 0.4, type: "triangle", volume: 0.09, notes: [349, 392, 440, 392] },
};

function scheduleTrack(trackName) {
  const track = TRACKS[trackName];
  if (!track) return;
  let i = 0;
  const playNext = () => {
    if (currentTrack !== trackName) return;
    playTone({ freq: track.notes[i % track.notes.length], duration: track.tempo * 0.9, type: track.type, volume: track.volume, bus: "music" });
    i++;
    musicTimer = setTimeout(playNext, track.tempo * 1000);
  };
  playNext();
}

export function playMusic(trackName) {
  if (currentTrack === trackName) return;
  currentTrack = trackName;
  ensureContext();
  clearTimeout(musicTimer);
  scheduleTrack(trackName);
}

export function stopMusic() {
  currentTrack = null;
  clearTimeout(musicTimer);
}
