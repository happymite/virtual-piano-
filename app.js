
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

let volume        = 0.7;
let waveType      = "triangle";
let octave        = 4;
let isSongPlaying = false;
let isFunMode     = false;
let songTimeouts  = [];

const activeMemeAudio = {};


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

const MEMES = [
  { label: "aaaa",    file: "memes/aaaa.mp3",                                    kbd: "A" },
  { label: "aayein",  file: "memes/aayein.mp3",                                  kbd: "S" },
  { label: "acha",    file: "memes/acha-ji.mp3",                                 kbd: "D" },
  { label: "kalal",   file: "memes/aisa-mat-karo.mp3",                           kbd: "F" },
  { label: "faaah",   file: "memes/faaah.mp3",                                   kbd: "G" },
  { label: "baigan",  file: "memes/baigan.mp3",                                  kbd: "H" },
  { label: "modi",    file: "memes/laure-na-bhujjam-x-modi.mp3",                 kbd: "J" },
  { label: "dun",     file: "memes/dun-dun-dun-sound-effect-brass_8nFBccR.mp3",  kbd: "K" },
  { label: "aag",     file: "memes/ma-ka-bhosda-aag.mp3",                        kbd: "L" },
  { label: "bhau",    file: "memes/sochna-pdta-hai-re-hindustani-bhau.mp3",      kbd: "W" },
  { label: "fart",    file: "memes/fart_2.mp3",                                  kbd: "E" },
  { label: "anime1",  file: "memes/yes_sIkqUeY.mp3",                             kbd: "T" },
  { label: "anime2",  file: "memes/anime-ahh.mp3",                               kbd: "Y" },
  { label: "wahh",    file: "memes/modi-ji-wah.mp3",                             kbd: "U" },
  { label: "kyu",     file: "memes/kyu-re-madarchod-cid.mp3",                    kbd: "O" },
  { label: "khatam",  file: "memes/khatam.mp3",                                  kbd: "P" },
  { label: "yay",     file: "memes/yay.mp3",                                     kbd: ";" },
];


const memeMap = {};
MEMES.forEach(m => { memeMap[m.kbd.toLowerCase()] = m; });
function stopAllMemes() {
  Object.keys(activeMemeAudio).forEach(key => {
    const audio = activeMemeAudio[key];
    if (audio) { audio.pause(); audio.currentTime = 0; }
    delete activeMemeAudio[key];
  });
}


function playMeme(kbd) {
  const key  = kbd.toLowerCase();
  const meme = memeMap[key];
  if (!meme) return;

  stopAllMemes();

  const audio = new Audio(meme.file);
  audio.volume  = volume;
  audio.preload = "auto";

  audio.onended = () => { delete activeMemeAudio[key]; };
  audio.onerror = () => {
    console.warn(`Missing meme file: ${meme.file}`);
    delete activeMemeAudio[key];
  };

  activeMemeAudio[key] = audio;
  audio.play().catch(err => console.warn("Audio play failed:", err));
}

function getNoteId(k) {
  return k.note + (k.octaveUp ? octave + 1 : octave);
}

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
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(volume,        now + 0.01);
  gainNode.gain.linearRampToValueAtTime(volume * 0.70, now + 0.08);
  gainNode.gain.linearRampToValueAtTime(volume * 0.55, now + 0.25);
  gainNode.gain.linearRampToValueAtTime(0,             now + 0.90);
  osc.start(now);
  osc.stop(now + 0.95);
}

function flashKeyByNote(noteId) {
  const el = document.querySelector(`[data-note="${noteId}"]`);
  if (!el) return;
  el.classList.add("pressed");
  setTimeout(() => el.classList.remove("pressed"), 160);
}

function flashKeyByKbd(kbd) {
  const el = kbdMap[kbd.toLowerCase()];
  if (!el) return;
  el.classList.add("pressed");
  setTimeout(() => el.classList.remove("pressed"), 200);
}

function triggerByNote(noteId) {
  playNote(noteId);
  flashKeyByNote(noteId);
}

function triggerByKbd(kbd) {
  if (isFunMode) {
    playMeme(kbd);
    flashKeyByKbd(kbd);
  } else {
    const el = kbdMap[kbd.toLowerCase()];
    if (el) triggerByNote(el.dataset.note);
  }
}

const wrap   = document.getElementById("piano-wrap");
const kbdMap = {};

KEY_LAYOUT.forEach(k => {
  const li      = document.createElement("li");
  const noteId  = getNoteId(k);
  const oct     = k.octaveUp ? octave + 1 : octave;
  const dispNote = k.note.replace("s", "♯");

  li.className    = `key ${k.type}`;
  li.dataset.note = noteId;
  li.dataset.kbd  = k.kbd;

  li.innerHTML = `
    <div class="key-label">
      <span class="note-name">${dispNote}<sub style="font-size:7px">${oct}</sub></span>
      <span class="kbd-hint">${k.kbd}</span>
    </div>`;

  li.addEventListener("mousedown", e => {
    e.preventDefault();
    triggerByKbd(k.kbd);
  });

  wrap.appendChild(li);
  kbdMap[k.kbd.toLowerCase()] = li;
});

document.addEventListener("keydown", e => {
  if (e.repeat || e.metaKey || e.ctrlKey) return;
  const key = e.key === ";" ? ";" : e.key.toLowerCase();
  triggerByKbd(key);
});

// ── Volume ───────────────────────────────────
document.getElementById("vol").addEventListener("input", e => {
  volume = parseFloat(e.target.value);
  document.getElementById("vol-val").textContent = Math.round(volume * 100) + "%";
});

// ── Waveform ─────────────────────────────────
document.getElementById("wave-type").addEventListener("change", e => {
  waveType = e.target.value;
});

document.querySelectorAll(".oct-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    octave = parseInt(btn.dataset.oct);
    document.querySelectorAll(".oct-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // Re-label every key with the new octave
    KEY_LAYOUT.forEach(k => {
      const li = wrap.querySelector(`[data-kbd="${k.kbd}"]`);
      if (!li) return;
      const noteId   = getNoteId(k);
      const oct      = k.octaveUp ? octave + 1 : octave;
      const dispNote = k.note.replace("s", "♯");
      li.dataset.note = noteId;
      if (!isFunMode) {
        li.querySelector(".note-name").innerHTML =
          `${dispNote}<sub style="font-size:7px">${oct}</sub>`;
      }
    });
  });
});

const funBtn     = document.getElementById("fun-btn");
const memeBanner = document.getElementById("meme-banner");
const container  = document.querySelector(".main-container");
const controls   = document.getElementById("piano-controls");
const appTitle   = document.getElementById("app-title");
const hintEl     = document.getElementById("hint");

funBtn.addEventListener("click", () => {
  isFunMode = !isFunMode;

  if (isFunMode) {
    // Enter Fun Mode
    funBtn.textContent = "🎹 Piano Mode";
    funBtn.classList.add("fun-active");
    container.classList.add("fun-mode");
    if (memeBanner) memeBanner.style.display = "block";
    if (controls)   controls.classList.add("dimmed");
    appTitle.textContent = "🎭 Meme Soundboard";
    if (hintEl) hintEl.textContent =
      "Each key plays a meme sound — keyboard shortcuts still work!";

    KEY_LAYOUT.forEach(k => {
      const li   = wrap.querySelector(`[data-kbd="${k.kbd}"]`);
      if (!li) return;
      const meme  = memeMap[k.kbd.toLowerCase()];
      const label = li.querySelector(".note-name");
      const hint  = li.querySelector(".kbd-hint");

      if (meme) {
        label.className   = "meme-name";
        label.textContent = meme.label;
        hint.textContent  = k.kbd;
        hint.style.opacity = "0.6";
      } else {
        label.className   = "meme-name";
        label.textContent = "—";
        label.style.opacity    = "0.25";
        li.style.opacity       = "0.35";
        li.style.pointerEvents = "none";
      }
    });

  } else {

    stopAllMemes();

    funBtn.textContent = "🤣 Fun Mode";
    funBtn.classList.remove("fun-active");
    container.classList.remove("fun-mode");
    if (memeBanner) memeBanner.style.display = "none";
    if (controls)   controls.classList.remove("dimmed");
    appTitle.textContent = "🎹 Virtual Piano";
    if (hintEl) hintEl.textContent =
      "Click keys or use keyboard shortcuts shown on each key";

    KEY_LAYOUT.forEach(k => {
      const li = wrap.querySelector(`[data-kbd="${k.kbd}"]`);
      if (!li) return;
      const oct      = k.octaveUp ? octave + 1 : octave;
      const dispNote = k.note.replace("s", "♯");

      li.style.opacity       = "";
      li.style.pointerEvents = "";

      const label = li.querySelector(".meme-name, .note-name");
      if (label) {
        label.className = "note-name";
        label.innerHTML = `${dispNote}<sub style="font-size:7px">${oct}</sub>`;
        label.style.opacity = "";
      }
      const hint = li.querySelector(".kbd-hint");
      if (hint) {
        hint.textContent   = k.kbd;
        hint.style.opacity = "";
      }
    });
  }
});

const SONGS = {
  twinkle: ["C4","C4","G4","G4","A4","A4","G4",null,"F4","F4","E4","E4","D4","D4","C4"],
  happy:   ["C4","C4","D4","C4","F4","E4",null,"C4","C4","D4","C4","G4","F4",null,
             "C4","C4","C5","A4","F4","E4","D4",null,"As4","As4","A4","F4","G4","F4"],
sunRaha: [
  "E4","E4","D4","C4","D4","E4",null,
  "G4","E4","D4","C4",null,
  "E4","E4","D4","C4","D4","E4",null,
  "G4","A4","G4","E4","D4","C4",null,
  "C4","D4","E4","G4","A4","G4","E4",null,
  "C4","D4","E4","G4","A4","G4","E4","D4","C4"
],
  ode:     ["E4","E4","F4","G4","G4","F4","E4","D4","C4","C4","D4","E4","E4","D4","D4",null,
             "E4","E4","F4","G4","G4","F4","E4","D4","C4","C4","D4","E4","D4","C4","C4"],
  scale:   ["C4","D4","E4","F4","G4","A4","B4","C5","B4","A4","G4","F4","E4","D4","C4"],
};

const playBtn = document.getElementById("play-btn");
const status  = document.getElementById("song-status");

playBtn.addEventListener("click", () => {
  if (isFunMode) {
    status.textContent = "Exit Fun Mode to play songs!";
    setTimeout(() => (status.textContent = ""), 1800);
    return;
  }
  if (isSongPlaying) {
    songTimeouts.forEach(clearTimeout);
    songTimeouts  = [];
    isSongPlaying = false;
    playBtn.textContent = "▶ Play";
    playBtn.classList.remove("playing");
    status.textContent  = "";
    return;
  }

  const sel = document.getElementById("song-sel").value;
  if (!sel) {
    status.textContent = "Pick a song first!";
    setTimeout(() => (status.textContent = ""), 1500);
    return;
  }

  const song    = SONGS[sel];
  isSongPlaying = true;
  playBtn.textContent = "■ Stop";
  playBtn.classList.add("playing");
  status.textContent  = "Playing…";

  let delay = 0;
  song.forEach(note => {
    const t = setTimeout(() => { if (note) triggerByNote(note); }, delay);
    songTimeouts.push(t);
    delay += 320;
  });

  const endT = setTimeout(() => {
    isSongPlaying = false;
    playBtn.textContent = "▶ Play";
    playBtn.classList.remove("playing");
    status.textContent  = "";
  }, delay + 100);
  songTimeouts.push(endT);
});

document.getElementById("song-sel").addEventListener("change", () => {
  if (!isSongPlaying) return;
  songTimeouts.forEach(clearTimeout);
  songTimeouts  = [];
  isSongPlaying = false;
  playBtn.textContent = "▶ Play";
  playBtn.classList.remove("playing");
  status.textContent  = "";
});

// ── FIX 4: Theme Switcher ─────────────────────
const THEMES = [
  { from: "#ffecd2", to: "#fcb69f" },
  { from: "#a1c4fd", to: "#c2e9fb" },
  { from: "#d4fc79", to: "#96e6a1" },
  { from: "#f093fb", to: "#f5576c" },
  { from: "#4facfe", to: "#00f2fe" },
  { from: "#43e97b", to: "#38f9d7" },
  { from: "#fa709a", to: "#fee140" },
];
let themeIdx   = 0;
let themeStyle = null;

document.getElementById("theme-btn").addEventListener("click", () => {
  themeIdx = (themeIdx + 1) % THEMES.length;
  const { from, to } = THEMES[themeIdx];
  document.body.style.background =
    `linear-gradient(120deg, ${from} 0%, ${to} 100%)`;
  if (!themeStyle) {
    themeStyle = document.createElement("style");
    document.head.appendChild(themeStyle);
  }
  themeStyle.textContent = `
    .key.white.pressed { background: linear-gradient(${from}, ${to}) !important; }
  `;
  if (hintEl) hintEl.style.color = to;
});
