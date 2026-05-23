
const audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();

const compressor = audioCtx.createDynamicsCompressor();
compressor.threshold.value = -18;
compressor.knee.value      = 12;
compressor.ratio.value     = 6;
compressor.attack.value    = 0.003;
compressor.release.value   = 0.15;

masterGain.connect(compressor);
compressor.connect(audioCtx.destination);

// ── State ────────────────────────────────────
let volume        = 0.7;
let waveType      = "triangle";
let octave        = 4;
let isSongPlaying = false;
let songTimeouts  = [];

// ── Note frequency table (3 octaves) ─────────
const NOTE_FREQ = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61,
  G3: 196.00, A3: 220.00, B3: 246.94,
  Cs3: 138.59, Ds3: 155.56, Fs3: 185.00, Gs3: 207.65, As3: 233.08,

  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
  G4: 392.00, A4: 440.00, B4: 493.88,
  Cs4: 277.18, Ds4: 311.13, Fs4: 369.99, Gs4: 415.30, As4: 466.16,

  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46,
  G5: 783.99, A5: 880.00, B5: 987.77,
  Cs5: 554.37, Ds5: 622.25, Fs5: 739.99, Gs5: 830.61, As5: 932.33,
};

// ── Key layout (white + black, 2 octaves shown) ─
const KEY_LAYOUT = [
  { note: "C",  type: "white", kbd: "A" },
  { note: "Cs", type: "black", kbd: "W" },
  { note: "D",  type: "white", kbd: "S" },
  { note: "Ds", type: "black", kbd: "E" },
  { note: "E",  type: "white", kbd: "D" },
  { note: "F",  type: "white", kbd: "F" },
  { note: "Fs", type: "black", kbd: "T" },
  { note: "G",  type: "white", kbd: "G" },
  { note: "Gs", type: "black", kbd: "Y" },
  { note: "A",  type: "white", kbd: "H" },
  { note: "As", type: "black", kbd: "U" },
  { note: "B",  type: "white", kbd: "J" },
  { note: "C",  type: "white", kbd: "K", octaveUp: true },
  { note: "Cs", type: "black", kbd: "O", octaveUp: true },
  { note: "D",  type: "white", kbd: "L", octaveUp: true },
  { note: "Ds", type: "black", kbd: "P", octaveUp: true },
  { note: "E",  type: "white", kbd: ";", octaveUp: true },
];

// ── Helpers ───────────────────────────────────
function getNoteId(k) {
  return k.note + (k.octaveUp ? octave + 1 : octave);
}

// ── Sound engine: ADSR envelope ───────────────
function playNote(noteId) {
  if (audioCtx.state === "suspended") audioCtx.resume();

  const freq = NOTE_FREQ[noteId];
  if (!freq) return;

  const osc      = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.connect(gainNode);
  gainNode.connect(masterGain);

  osc.type = waveType;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

  const now = audioCtx.currentTime;
  // Attack → Decay → Sustain → Release
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(volume,        now + 0.01);  // attack
  gainNode.gain.linearRampToValueAtTime(volume * 0.70, now + 0.08);  // decay
  gainNode.gain.linearRampToValueAtTime(volume * 0.55, now + 0.25);  // sustain
  gainNode.gain.linearRampToValueAtTime(0,             now + 0.90);  // release

  osc.start(now);
  osc.stop(now + 0.95);
}

// ── Visual feedback ───────────────────────────
function flashKey(noteId) {
  const el = document.querySelector(`[data-note="${noteId}"]`);
  if (!el) return;
  el.classList.add("pressed");
  setTimeout(() => el.classList.remove("pressed"), 160);
}

function triggerNote(noteId) {
  playNote(noteId);
  flashKey(noteId);
}

const kbdMap = {};
const wrap   = document.getElementById("piano-wrap");

KEY_LAYOUT.forEach(k => {
  const li     = document.createElement("li");
  const noteId = getNoteId(k);
  const oct    = k.octaveUp ? octave + 1 : octave;
  const displayNote = k.note.replace("s", "♯");

  li.className    = `key ${k.type}`;
  li.dataset.note = noteId;
  li.dataset.kbd  = k.kbd;
  li.innerHTML    = `
    <div class="key-label">
      <span class="note-name">${displayNote}<sub style="font-size:7px">${oct}</sub></span>
      <span class="kbd-hint">${k.kbd}</span>
    </div>`;

  li.addEventListener("mousedown", e => {
    e.preventDefault();
    triggerNote(li.dataset.note);
  });

  wrap.appendChild(li);
  kbdMap[k.kbd.toLowerCase()] = li;
});

// ── Keyboard input ────────────────────────────
document.addEventListener("keydown", e => {
  if (e.repeat || e.metaKey || e.ctrlKey) return;
  const key = e.key === ";" ? ";" : e.key.toLowerCase();
  const el  = kbdMap[key];
  if (!el) return;
  triggerNote(el.dataset.note);
});

// ── Volume control ────────────────────────────
document.getElementById("vol").addEventListener("input", e => {
  volume = parseFloat(e.target.value);
  document.getElementById("vol-val").textContent = Math.round(volume * 100) + "%";
});

// ── Waveform selector ─────────────────────────
document.getElementById("wave-type").addEventListener("change", e => {
  waveType = e.target.value;
});

// ── Octave selector ───────────────────────────
document.querySelectorAll(".oct-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    octave = parseInt(btn.dataset.oct);
    document.querySelectorAll(".oct-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // Update all key note IDs and labels
    KEY_LAYOUT.forEach(k => {
      const li = wrap.querySelector(`[data-kbd="${k.kbd}"]`);
      if (!li) return;
      const noteId      = getNoteId(k);
      const oct         = k.octaveUp ? octave + 1 : octave;
      const displayNote = k.note.replace("s", "♯");
      li.dataset.note   = noteId;
      li.querySelector(".note-name").innerHTML =
        `${displayNote}<sub style="font-size:7px">${oct}</sub>`;
    });
  });
});

// ── Predefined songs ──────────────────────────
// null = rest (silence for one beat)
const SONGS = {
  twinkle: [
    "C4","C4","G4","G4","A4","A4","G4", null,
    "F4","F4","E4","E4","D4","D4","C4",
  ],
  happy: [
    "C4","C4","D4","C4","F4","E4", null,
    "C4","C4","D4","C4","G4","F4", null,
    "C4","C4","C5","A4","F4","E4","D4", null,
    "As4","As4","A4","F4","G4","F4",
  ],

  // ── Sun Raha Hai Na Tu ──
  sunraha: [
    "E4","G4","A4","G4","E4",
    "E4","G4","A4","B4","A4",
    "G4","E4","D4","E4",
    null,
    "E4","G4","A4","G4","E4",
    "D4","E4","G4","A4","G4",
    "E4"
  ],
  ode: [
    "E4","E4","F4","G4","G4","F4","E4","D4",
    "C4","C4","D4","E4","E4","D4","D4", null,
    "E4","E4","F4","G4","G4","F4","E4","D4",
    "C4","C4","D4","E4","D4","C4","C4",
  ],
  scale: [
    "C4","D4","E4","F4","G4","A4","B4","C5",
    "B4","A4","G4","F4","E4","D4","C4",
  ],
};

// ── Song playback ─────────────────────────────
const playBtn = document.getElementById("play-btn");
const status  = document.getElementById("song-status");

playBtn.addEventListener("click", () => {
  if (isSongPlaying) {
    // Stop
    songTimeouts.forEach(clearTimeout);
    songTimeouts  = [];
    isSongPlaying = false;
    playBtn.textContent = "▶ Play";
    playBtn.classList.remove("playing");
    status.textContent = "";
    return;
  }

  const sel  = document.getElementById("song-sel").value;
  if (!sel) {
    status.textContent = "Pick a song first!";
    setTimeout(() => (status.textContent = ""), 1500);
    return;
  }

  const song = SONGS[sel];
  isSongPlaying       = true;
  playBtn.textContent = "■ Stop";
  playBtn.classList.add("playing");
  status.textContent  = "Playing…";

  let delay = 0;
  song.forEach(note => {
    const t = setTimeout(() => { if (note) triggerNote(note); }, delay);
    songTimeouts.push(t);
    delay += 320;
  });

  const endT = setTimeout(() => {
    isSongPlaying       = false;
    playBtn.textContent = "▶ Play";
    playBtn.classList.remove("playing");
    status.textContent  = "";
  }, delay + 100);
  songTimeouts.push(endT);
});

// Stop song if user changes selection mid-play
document.getElementById("song-sel").addEventListener("change", () => {
  if (!isSongPlaying) return;
  songTimeouts.forEach(clearTimeout);
  songTimeouts        = [];
  isSongPlaying       = false;
  playBtn.textContent = "▶ Play";
  playBtn.classList.remove("playing");
  status.textContent  = "";
});

// ── Theme switcher ────────────────────────────
const THEMES = [
  { from: "#ffecd2", to: "#fcb69f" },  // peach (default)
  { from: "#a1c4fd", to: "#c2e9fb" },  // sky blue
  { from: "#d4fc79", to: "#96e6a1" },  // lime green
  { from: "#f093fb", to: "#f5576c" },  // pink magenta
  { from: "#4facfe", to: "#00f2fe" },  // cyan
  { from: "#43e97b", to: "#38f9d7" },  // emerald
  { from: "#130106", to: "#181818" },  // sunset
];

let themeIdx   = 0;
let themeStyle = null;

document.getElementById("theme-btn").addEventListener("click", () => {
  themeIdx = (themeIdx + 1) % THEMES.length;
  const { from, to } = THEMES[themeIdx];

  // Update body background
  document.body.style.background = `linear-gradient(120deg, ${from} 0%, ${to} 100%)`;

  // Update pressed-key highlight via injected <style>
  if (!themeStyle) {
    themeStyle = document.createElement("style");
    document.head.appendChild(themeStyle);
  }
  themeStyle.textContent = `
    .key.white.pressed { background: linear-gradient(${from}, ${to}) !important; }
  `;

  // Tint the hint text to match
  document.getElementById("hint").style.color = to;
});