import { useState, useEffect, useRef, useCallback } from "react";

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const STANDARD_TUNING = [
  { string: 6, note: "E", freq: 82.41, label: "E2" },
  { string: 5, note: "A", freq: 110.0, label: "A2" },
  { string: 4, note: "D", freq: 146.83, label: "D3" },
  { string: 3, note: "G", freq: 196.0, label: "G3" },
  { string: 2, note: "B", freq: 246.94, label: "B3" },
  { string: 1, note: "E", freq: 329.63, label: "E4" },
];

const CHORD_TYPES = {
  "Mayor": [0, 4, 7],
  "Menor": [0, 3, 7],
  "7ª dom.": [0, 4, 7, 10],
  "Mayor 7ª": [0, 4, 7, 11],
  "Menor 7ª": [0, 3, 7, 10],
  "Menor maj.7": [0, 3, 7, 11],
  "Sus2": [0, 2, 7],
  "Sus4": [0, 5, 7],
  "6ª mayor": [0, 4, 7, 9],
  "6ª menor": [0, 3, 7, 9],
  "9ª dom.": [0, 2, 4, 7, 10],
  "Add9": [0, 2, 4, 7],
  "Disminuido": [0, 3, 6],
  "Disminuido 7": [0, 3, 6, 9],
  "Semidisminuido": [0, 3, 6, 10],
  "Aumentado": [0, 4, 8],
  "Quinta (power)": [0, 7],
};

const SCALES = {
  "Mayor (jónico)": [0, 2, 4, 5, 7, 9, 11],
  "Menor natural": [0, 2, 3, 5, 7, 8, 10],
  "Menor armónica": [0, 2, 3, 5, 7, 8, 11],
  "Menor melódica": [0, 2, 3, 5, 7, 9, 11],
  "Pentatónica mayor": [0, 2, 4, 7, 9],
  "Pentatónica menor": [0, 3, 5, 7, 10],
  "Blues": [0, 3, 5, 6, 7, 10],
  "Dórico": [0, 2, 3, 5, 7, 9, 10],
  "Frigio": [0, 1, 3, 5, 7, 8, 10],
  "Lidio": [0, 2, 4, 6, 7, 9, 11],
  "Mixolidio": [0, 2, 4, 5, 7, 9, 10],
  "Locrio": [0, 1, 3, 5, 6, 8, 10],
};

const FRETBOARD_STRINGS = [
  { label: "E4", noteIndex: 4 },
  { label: "B3", noteIndex: 11 },
  { label: "G3", noteIndex: 7 },
  { label: "D3", noteIndex: 2 },
  { label: "A2", noteIndex: 9 },
  { label: "E2", noteIndex: 4 },
];

const FRET_MARKERS = [3, 5, 7, 9, 12];
const FRET_COUNT = 12;

const INTERVAL_NAMES = [
  "Unísono", "2ª menor", "2ª mayor", "3ª menor", "3ª mayor", "4ª justa",
  "Tritono", "5ª justa", "6ª menor", "6ª mayor", "7ª menor", "7ª mayor", "Octava",
];
const INTERVAL_QUALITY = [
  "Perfecto", "Disonante", "Suave", "Sombrío", "Brillante", "Estable",
  "Tenso", "Estable", "Sombrío", "Brillante", "Suave", "Tenso", "Perfecto",
];

// ─── NULLTONE design system — 3 paletas ───────────────────────────────────────
const PALETTES = {
  A: {
    name: "NEON VIOLET",
    bg0: "#0B0420", bg1: "#150A2E", bg2: "#1F1242",
    line: "#3B2A66", lineDim: "#251847",
    text: "#E8E1FF", textDim: "#9C8FD9",
    accent: "#7BF3FF", accent2: "#FF4FB8", accent3: "#B47BFF",
  },
  B: {
    name: "CRT AMBER",
    bg0: "#08070D", bg1: "#10101F", bg2: "#181A2E",
    line: "#2C3556", lineDim: "#1B2140",
    text: "#F2E9D8", textDim: "#A89B7A",
    accent: "#FFB347", accent2: "#FF6B4A", accent3: "#5BE0FF",
  },
  C: {
    name: "TOXIC LIME",
    bg0: "#04080A", bg1: "#0A1014", bg2: "#0F1A1E",
    line: "#1F3A3F", lineDim: "#152528",
    text: "#D8FFE8", textDim: "#5DA08A",
    accent: "#9DFF4A", accent2: "#FF3D7F", accent3: "#4AE0C5",
  },
};

// Mutable — reassigned from the active palette before every render in GuitarTuner.
// Sub-components read this at render time (sync) and rAF loops read it at frame time (latest value).
let C = {
  bg: "#150A2E", bgDeep: "#0B0420", panel: "#150A2E", panel2: "#1F1242",
  border: "#3B2A66", borderBright: "#B47BFF",
  text: "#E8E1FF", textMid: "#E8E1FF", textDim: "#9C8FD9",
  cyan: "#7BF3FF", magenta: "#FF4FB8",
  green: "#B47BFF", yellow: "#7BF3FF", red: "#FF4FB8", violet: "#B47BFF",
};

// ─── Logo NULLTONE — versión 1 en color ───────────────────────────────────────
function LogoNulltone({ accent, accent2, size = 1 }) {
  const w = 120 * size, h = 48 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 120 48" style={{ filter: `drop-shadow(0 0 6px ${accent}88)`, display: "block" }}>
      <defs>
        <linearGradient id="nt-g" x1="0" x2="1">
          <stop offset="0" stopColor={accent} />
          <stop offset="1" stopColor={accent2} />
        </linearGradient>
      </defs>
      {/* diapasón: dos polos verticales */}
      <rect x="14" y="6" width="3" height="36" fill={accent} />
      <rect x="34" y="6" width="3" height="36" fill={accent} />
      {/* tallo */}
      <rect x="22" y="32" width="7" height="14" fill={accent} opacity="0.5" />
      {/* onda entre los polos */}
      <path d="M5 24 Q 13 14, 25 24 T 46 24" fill="none" stroke="url(#nt-g)" strokeWidth="2.4" strokeLinecap="square" />
      {/* wordmark */}
      <text x="56" y="22" fontFamily='"Orbitron", monospace' fontWeight="800" fontSize="14" fill={C.text} letterSpacing="2">NULL</text>
      <text x="56" y="38" fontFamily='"Orbitron", monospace' fontWeight="800" fontSize="14" fill={accent2} letterSpacing="2">TONE</text>
    </svg>
  );
}

// ─── DSP ──────────────────────────────────────────────────────────────────────
function freqToNote(freq) {
  if (freq <= 0) return null;
  const A4 = 440;
  const semitones = Math.round(12 * Math.log2(freq / A4));
  const noteIndex = ((semitones % 12) + 12 + 9) % 12;
  const octave = Math.floor((semitones + 9) / 12) + 4;
  const cents = Math.round((12 * Math.log2(freq / A4) - semitones) * 100);
  return { note: NOTES[noteIndex], octave, cents, noteIndex };
}

function detectPitch(buffer, sampleRate) {
  const SIZE = buffer.length;
  let energy = 0;
  for (let i = 0; i < SIZE; i++) energy += buffer[i] * buffer[i];
  const rms = Math.sqrt(energy / SIZE);
  if (rms < 0.002) return -1;

  const minLag = Math.floor(sampleRate / 1400);
  const maxLag = Math.min(Math.floor(sampleRate / 60), SIZE - 1);

  const r = new Float32Array(maxLag + 2);
  for (let lag = minLag; lag <= maxLag + 1; lag++) {
    let sum = 0;
    const N = SIZE - lag;
    for (let i = 0; i < N; i++) sum += buffer[i] * buffer[i + lag];
    r[lag] = sum / N;
  }

  let d = minLag;
  while (d < maxLag && r[d] > r[d + 1]) d++;

  let bestLag = -1, bestVal = 0;
  for (let lag = d; lag <= maxLag; lag++) {
    if (r[lag] > bestVal) { bestVal = r[lag]; bestLag = lag; }
  }
  const energyAvg = energy / SIZE;
  if (bestLag < 0 || bestVal < energyAvg * 0.3) return -1;

  for (const div of [2, 3]) {
    const candidate = Math.round(bestLag / div);
    if (candidate >= minLag && r[candidate] > bestVal * 0.9) {
      bestLag = candidate;
      bestVal = r[candidate];
      break;
    }
  }

  const x1 = r[bestLag - 1] || 0;
  const x2 = r[bestLag];
  const x3 = r[bestLag + 1] || 0;
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  const refinedLag = a !== 0 ? bestLag - b / (2 * a) : bestLag;

  return sampleRate / refinedLag;
}

// ─── Sub-componentes ───────────────────────────────────────────────────────────
function Fretboard({ rootIndex, scaleIntervals }) {
  const scaleSet = new Set(scaleIntervals.map((i) => (i + rootIndex) % 12));
  return (
    <div style={{ overflowX: "auto", padding: "4px 0 8px" }}>
      <div style={{ display: "grid", gridTemplateColumns: `40px repeat(${FRET_COUNT}, minmax(34px, 1fr))`, gap: "2px", minWidth: "480px" }}>
        <div />
        {Array.from({ length: FRET_COUNT }, (_, i) => i + 1).map((f) => (
          <div key={`h${f}`} style={{ textAlign: "center", color: FRET_MARKERS.includes(f) ? C.violet : C.textDim, fontSize: "11px", letterSpacing: "1px", fontWeight: 600, paddingBottom: "2px" }}>{f}</div>
        ))}
        {FRETBOARD_STRINGS.map((s, si) => (
          <div key={`row${si}`} style={{ display: "contents" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: C.textMid, fontSize: "12px", fontWeight: 700, letterSpacing: "1px", borderRight: `2px solid ${C.borderBright}`, paddingRight: "6px" }}>{s.label}</div>
            {Array.from({ length: FRET_COUNT }, (_, fi) => {
              const fret = fi + 1;
              const noteIdx = (s.noteIndex + fret) % 12;
              const inScale = scaleSet.has(noteIdx);
              const isRoot = inScale && noteIdx === rootIndex;
              const bg = isRoot ? C.magenta : inScale ? `${C.cyan}55` : C.bgDeep;
              const color = isRoot ? C.bg : inScale ? C.bg : C.textDim;
              const border = isRoot ? C.magenta : inScale ? C.cyan : C.border;
              return (
                <div key={`c${si}-${fret}`} style={{ position: "relative", textAlign: "center", padding: "8px 2px", background: bg, border: `1px solid ${border}`, borderRadius: "3px", color, fontSize: "12px", fontWeight: 700, boxShadow: isRoot ? `0 0 10px ${C.magenta}88` : inScale ? `0 0 6px ${C.cyan}44` : "none" }}>
                  {isRoot ? NOTES[noteIdx] : inScale ? <span style={{ fontSize: "10px", opacity: 0.7 }}>●</span> : (FRET_MARKERS.includes(fret) && si === 2 ? <span style={{ color: C.violet, opacity: 0.5 }}>•</span> : "")}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function IntervalView({ noteA, noteB, setNoteA, setNoteB }) {
  const semis = ((noteB - noteA) % 12 + 12) % 12;
  const name = INTERVAL_NAMES[semis === 0 ? 0 : semis];
  const quality = INTERVAL_QUALITY[semis];
  const ratio = Math.pow(2, semis / 12);
  const cents = semis * 100;

  const renderRow = (selected, onPick, label) => (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ color: C.textDim, fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", fontWeight: 600, marginBottom: "6px" }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "3px" }}>
        {NOTES.map((n, i) => {
          const sel = i === selected;
          return (
            <button key={n} onClick={() => onPick(i)} style={{ padding: "8px 2px", background: sel ? `${C.cyan}26` : C.bgDeep, border: `1px solid ${sel ? C.cyan : C.border}`, borderRadius: "3px", color: sel ? C.cyan : C.textMid, fontSize: n.includes("#") ? "11px" : "12px", fontWeight: sel ? 800 : 600, cursor: "pointer", fontFamily: "inherit", boxShadow: sel ? `0 0 10px ${C.cyan}55` : "none", transition: "all 0.15s" }}>{n}</button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div>
      {renderRow(noteA, setNoteA, "Nota A")}
      {renderRow(noteB, setNoteB, "Nota B")}
      <div style={{ textAlign: "center", padding: "20px 0 12px" }}>
        <div style={{ color: C.textDim, fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", fontWeight: 600, marginBottom: "8px" }}>Intervalo</div>
        <div style={{ fontSize: "44px", fontWeight: 400, color: C.cyan, lineHeight: 1.1, letterSpacing: "-1px", textShadow: `0 0 30px ${C.cyan}77`, fontFamily: '"Major Mono Display", monospace' }}>{name}</div>
        <div style={{ color: C.violet, fontSize: "14px", letterSpacing: "2px", marginTop: "8px", fontWeight: 700, textTransform: "uppercase" }}>{quality}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginTop: "12px" }}>
        {[["SEMITONOS", semis], ["CENTS", cents], ["RATIO", ratio.toFixed(3)]].map(([lab, val]) => (
          <div key={lab} style={{ padding: "10px", background: C.bgDeep, border: `1px solid ${C.border}`, borderRadius: "3px", textAlign: "center" }}>
            <div style={{ color: C.textDim, fontSize: "10px", letterSpacing: "2px", fontWeight: 600 }}>{lab}</div>
            <div style={{ color: C.text, fontSize: "20px", fontWeight: 700, marginTop: "4px" }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Waveform({ analyser, active }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  useEffect(() => {
    if (!active || !analyser) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = C.border; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2); ctx.stroke();
      }
      return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);
    function draw() {
      animRef.current = requestAnimationFrame(draw);
      analyser.getFloatTimeDomainData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // scanlines — reads C.violet at frame time (always latest)
      for (let y = 0; y < canvas.height; y += 3) {
        ctx.fillStyle = C.violet + "14";
        ctx.fillRect(0, y, canvas.width, 1);
      }
      ctx.lineWidth = 1.8; ctx.strokeStyle = C.cyan;
      ctx.shadowBlur = 12; ctx.shadowColor = C.cyan;
      ctx.beginPath();
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i];
        const y = (v * canvas.height) / 2 + canvas.height / 2;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.stroke(); ctx.shadowBlur = 0;
    }
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [active, analyser]);
  return (<canvas ref={canvasRef} width={600} height={80} style={{ width: "100%", height: "80px", display: "block" }} />);
}

// ─── App principal ─────────────────────────────────────────────────────────────
export default function GuitarTuner() {
  const [theme, setTheme] = useState("A");
  const [active, setActive] = useState(false);
  const [freq, setFreq] = useState(null);
  const [noteData, setNoteData] = useState(null);
  const [mode, setMode] = useState("tuner");
  const [closestString, setClosestString] = useState(null);
  const [error, setError] = useState(null);
  const [scaleRoot, setScaleRoot] = useState(0);
  const [scaleName, setScaleName] = useState("Mayor (jónico)");
  const [chordRoot, setChordRoot] = useState(0);
  const [chordType, setChordType] = useState("Mayor");
  const [intervalA, setIntervalA] = useState(0);
  const [intervalB, setIntervalB] = useState(7);

  // Actualiza C con la paleta activa antes de renderizar
  const p = PALETTES[theme];
  C = {
    bg: p.bg1,
    bgDeep: p.bg0,
    panel: p.bg1,
    panel2: p.bg2,
    border: p.line,
    borderBright: p.accent3,
    text: p.text,
    textMid: p.text,
    textDim: p.textDim,
    cyan: p.accent,
    magenta: p.accent2,
    green: p.accent3,
    yellow: p.accent,
    red: p.accent2,
    violet: p.accent3,
  };

  // Sincroniza el fondo del body con el tema activo
  useEffect(() => {
    let s = document.getElementById("nt-theme");
    if (!s) { s = document.createElement("style"); s.id = "nt-theme"; document.head.appendChild(s); }
    s.textContent = `body { background: ${p.bg0} !important; }`;
  }, [theme, p.bg0]);

  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const streamRef = useRef(null);
  const animRef = useRef(null);

  const stopAudio = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    if (sourceRef.current) sourceRef.current.disconnect();
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (audioCtxRef.current) audioCtxRef.current.close();
    audioCtxRef.current = null; analyserRef.current = null;
    sourceRef.current = null; streamRef.current = null;
    setActive(false); setFreq(null); setNoteData(null);
  }, []);

  const startAudio = useCallback(async () => {
    try {
      if (!window.isSecureContext) {
        setError(`Contexto no seguro. Origen: ${window.location.origin}`);
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Este navegador no expone navigator.mediaDevices.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true },
        video: false,
      });
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") await audioCtx.resume();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0;
      const source = audioCtx.createMediaStreamSource(stream);
      const hp = audioCtx.createBiquadFilter();
      hp.type = "highpass"; hp.frequency.value = 50;
      const lp = audioCtx.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 1800;
      const gain = audioCtx.createGain();
      gain.gain.value = 6;
      source.connect(hp); hp.connect(lp); lp.connect(gain); gain.connect(analyser);
      audioCtxRef.current = audioCtx; analyserRef.current = analyser;
      sourceRef.current = source; streamRef.current = stream;
      setActive(true); setError(null);
    } catch (e) {
      setError(`${e.name}: ${e.message}`);
    }
  }, []);

  useEffect(() => {
    if (!active || !analyserRef.current) return;
    const analyser = analyserRef.current;
    const buffer = new Float32Array(analyser.fftSize);
    let lastDetectMs = 0;
    let lastUpdateMs = 0;
    const HOLD_MS = 800;
    const UPDATE_MS = 33;
    const EMA_ALPHA = 0.2;
    const STABILITY_CENTS = 4;
    const STABILITY_FRAMES = 3;

    let smoothedFreq = null;
    let stableCount = 0;

    function tick() {
      analyser.getFloatTimeDomainData(buffer);
      const analysisBuffer = smoothedFreq != null && smoothedFreq > 180
        ? buffer.subarray(0, 2048)
        : buffer;
      const rawFreq = detectPitch(analysisBuffer, audioCtxRef.current.sampleRate);
      const now = performance.now();

      if (rawFreq > 60 && rawFreq < 1400) {
        lastDetectMs = now;
        const centsDiff = smoothedFreq != null
          ? Math.abs(1200 * Math.log2(rawFreq / smoothedFreq))
          : Infinity;
        const alpha = centsDiff > 50 ? 0.8 : EMA_ALPHA;
        smoothedFreq = smoothedFreq == null
          ? rawFreq
          : smoothedFreq + alpha * (rawFreq - smoothedFreq);
        const postDiff = Math.abs(1200 * Math.log2(rawFreq / smoothedFreq));
        if (postDiff < STABILITY_CENTS) {
          stableCount = Math.min(stableCount + 1, STABILITY_FRAMES + 1);
        } else {
          stableCount = 0;
        }
        if (stableCount >= STABILITY_FRAMES && now - lastUpdateMs >= UPDATE_MS) {
          lastUpdateMs = now;
          setFreq(Math.round(smoothedFreq * 10) / 10);
          const nd = freqToNote(smoothedFreq);
          setNoteData(nd);
          const closest = STANDARD_TUNING.reduce((prev, curr) =>
            Math.abs(curr.freq - smoothedFreq) < Math.abs(prev.freq - smoothedFreq) ? curr : prev
          );
          setClosestString(closest);
        }
      } else if (now - lastDetectMs > HOLD_MS) {
        smoothedFreq = null;
        stableCount = 0;
        setFreq(null); setNoteData(null); setClosestString(null);
      }
      animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [active]);

  const centsColor = noteData
    ? Math.abs(noteData.cents) < 5 ? C.green
      : Math.abs(noteData.cents) < 15 ? C.yellow : C.red
    : C.textDim;
  const centsPercent = noteData ? Math.max(0, Math.min(100, (noteData.cents + 50) / 100 * 100)) : 50;

  const labelStyle = { color: C.textMid, fontSize: "13px", letterSpacing: "3px", textTransform: "uppercase", fontWeight: 600 };
  const microLabelStyle = { color: C.textDim, fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px", boxSizing: "border-box" }}>
      {/* scanlines overlay */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 10, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.18) 2px, rgba(0,0,0,0.18) 3px)" }} />

      <div style={{ width: "100%", maxWidth: "560px", background: `linear-gradient(160deg, ${C.panel2} 0%, ${C.bgDeep} 100%)`, border: `1px solid ${C.border}`, borderRadius: "6px", boxShadow: `0 0 60px ${C.cyan}18, 0 0 1px ${C.borderBright}, inset 0 1px 0 ${C.cyan}12`, overflow: "hidden", position: "relative", zIndex: 1 }}>

        {/* ── Header ── */}
        <div style={{ padding: "14px 24px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <LogoNulltone accent={p.accent} accent2={p.accent2} size={0.85} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
            {/* estado */}
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: active ? C.green : C.border, boxShadow: active ? `0 0 14px ${C.green}` : "none", transition: "all 0.3s" }} />
              <span style={{ color: active ? C.green : C.textDim, fontSize: "13px", letterSpacing: "2px", fontWeight: 700 }}>{active ? "LIVE" : "STANDBY"}</span>
            </div>
            {/* selector de tema */}
            <div style={{ display: "flex", gap: "4px" }}>
              {(["A", "B", "C"]).map((t) => {
                const tp = PALETTES[t];
                const sel = theme === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    title={tp.name}
                    style={{
                      padding: "3px 9px",
                      background: sel ? tp.accent + "22" : "transparent",
                      border: `1px solid ${sel ? tp.accent : C.border}`,
                      borderRadius: "3px",
                      cursor: "pointer",
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "1px",
                      color: sel ? tp.accent : C.textDim,
                      boxShadow: sel ? `0 0 8px ${tp.accent}66` : "none",
                      transition: "all 0.15s",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: tp.accent, display: "inline-block", boxShadow: sel ? `0 0 6px ${tp.accent}` : "none" }} />
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ padding: "14px 24px 0", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
          {[
            ["tuner", "AFINADOR"],
            ["chord", "ACORDES"],
            ["scales", "ESCALAS"],
            ["intervals", "INTERV."],
          ].map(([m, label]) => {
            const sel = mode === m;
            return (
              <button key={m} onClick={() => setMode(m)} style={{ padding: "9px 6px", background: sel ? C.cyan : "transparent", color: sel ? C.bgDeep : C.textMid, border: `1px solid ${sel ? C.cyan : C.border}`, borderRadius: "3px", fontSize: "12px", letterSpacing: "1px", cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase", fontWeight: 700, transition: "all 0.2s", boxShadow: sel ? `0 0 12px ${C.cyan}66` : "none" }}>{label}</button>
            );
          })}
        </div>

        {/* ── Modo afinador ── */}
        {mode === "tuner" && (
          <div style={{ padding: "16px 24px 8px" }}>
            <div style={{ background: C.bgDeep, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "8px", position: "relative", overflow: "hidden" }}>
              <Waveform analyser={analyserRef.current} active={active} />
              <div style={{ position: "absolute", top: "6px", left: "12px", ...microLabelStyle, color: C.violet }}>SIGNAL</div>
            </div>
          </div>
        )}
        {mode === "tuner" && (
          <div style={{ padding: "16px 24px" }}>
            <div style={{ textAlign: "center", padding: "24px 0 16px", position: "relative" }}>
              <div style={{ fontSize: "128px", fontWeight: 400, color: noteData ? centsColor : C.textDim, lineHeight: 1, letterSpacing: "-5px", transition: "color 0.15s", fontFamily: '"Major Mono Display", monospace', textShadow: noteData ? `0 0 50px ${centsColor}88, 0 0 20px ${centsColor}55` : "none" }}>
                {noteData ? noteData.note : "--"}
              </div>
              {noteData && (<div style={{ color: C.textMid, fontSize: "20px", marginTop: "8px", fontWeight: 600 }}>OCT {noteData.octave}</div>)}
            </div>
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: C.textMid, letterSpacing: "2px", marginBottom: "10px", fontWeight: 600 }}>
                <span>-50</span>
                <span style={{ color: noteData ? centsColor : C.textMid, fontWeight: 700 }}>{noteData ? (noteData.cents > 0 ? `+${noteData.cents}` : noteData.cents) + " CTS" : "0 CTS"}</span>
                <span>+50</span>
              </div>
              <div style={{ height: "8px", background: C.bgDeep, border: `1px solid ${C.border}`, borderRadius: "2px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", left: "50%", top: 0, width: "2px", height: "100%", background: C.violet, transform: "translateX(-50%)", opacity: 0.6 }} />
                <div style={{ position: "absolute", left: `${centsPercent}%`, top: "0", width: "4px", height: "100%", background: centsColor, transform: "translateX(-50%)", boxShadow: `0 0 12px ${centsColor}`, transition: "left 0.1s, background 0.2s", borderRadius: "1px" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: C.bgDeep, border: `1px solid ${C.border}`, borderRadius: "3px", marginBottom: "16px" }}>
              <span style={{ ...microLabelStyle, color: C.magenta }}>FREQ</span>
              <span style={{ color: C.cyan, fontSize: "28px", letterSpacing: "2px", fontWeight: 700, textShadow: `0 0 12px ${C.cyan}66` }}>{freq ? `${freq.toFixed(1)} Hz` : "---.- Hz"}</span>
            </div>
            <div style={{ marginBottom: "8px" }}>
              <div style={{ ...labelStyle, marginBottom: "10px" }}>CUERDAS ESTANDAR</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "6px" }}>
                {STANDARD_TUNING.map((s) => {
                  const isClosest = closestString?.string === s.string;
                  const stringColor = isClosest ? (noteData ? centsColor : C.cyan) : C.textMid;
                  return (
                    <div key={s.string} style={{ textAlign: "center", padding: "10px 4px", background: isClosest ? `${centsColor}14` : C.bgDeep, border: `1px solid ${isClosest ? centsColor : C.border}`, borderRadius: "3px", transition: "all 0.15s", boxShadow: isClosest ? `0 0 14px ${centsColor}44` : "none" }}>
                      <div style={{ color: stringColor, fontSize: "24px", fontWeight: 700, lineHeight: 1 }}>{s.note}</div>
                      <div style={{ color: isClosest ? centsColor : C.textDim, fontSize: "12px", marginTop: "6px", letterSpacing: "1px", fontWeight: 600 }}>{s.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Modo acordes ── */}
        {mode === "chord" && (
          <div style={{ padding: "16px 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "10px", marginBottom: "14px" }}>
              <div>
                <div style={{ ...microLabelStyle, marginBottom: "6px", color: C.magenta }}>TÓNICA</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "3px" }}>
                  {NOTES.map((n, i) => {
                    const sel = i === chordRoot;
                    return (
                      <button key={n} onClick={() => setChordRoot(i)} style={{ padding: "8px 2px", background: sel ? C.magenta : C.bgDeep, border: `1px solid ${sel ? C.magenta : C.border}`, borderRadius: "3px", color: sel ? C.bgDeep : C.textMid, fontSize: n.includes("#") ? "11px" : "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: sel ? `0 0 10px ${C.magenta}88` : "none" }}>{n}</button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div style={{ ...microLabelStyle, marginBottom: "6px", color: C.magenta }}>TIPO DE ACORDE</div>
                <select value={chordType} onChange={(e) => setChordType(e.target.value)} style={{ width: "100%", padding: "10px 8px", background: C.bgDeep, border: `1px solid ${C.border}`, borderRadius: "3px", color: C.cyan, fontSize: "14px", fontWeight: 700, fontFamily: "inherit", letterSpacing: "1px", cursor: "pointer" }}>
                  {Object.keys(CHORD_TYPES).map((t) => (<option key={t} value={t} style={{ background: C.bgDeep }}>{t}</option>))}
                </select>
                <div style={{ marginTop: "8px", display: "flex", gap: "4px", flexWrap: "wrap" }}>
                  {CHORD_TYPES[chordType].map((iv) => (
                    <span key={iv} style={{ padding: "4px 8px", background: `${C.cyan}1a`, border: `1px solid ${C.cyan}`, borderRadius: "3px", color: C.cyan, fontSize: "12px", fontWeight: 700 }}>{NOTES[(iv + chordRoot) % 12]}</span>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ ...labelStyle, marginBottom: "8px" }}>MÁSTIL</div>
            <Fretboard rootIndex={chordRoot} scaleIntervals={CHORD_TYPES[chordType]} />
            <div style={{ marginTop: "12px", padding: "10px 14px", background: C.bgDeep, border: `1px solid ${C.border}`, borderRadius: "3px", fontSize: "12px", color: C.textMid, letterSpacing: "1px", lineHeight: "1.6" }}>
              <span style={{ color: C.magenta, fontWeight: 700 }}>●</span> fundamental · <span style={{ color: C.cyan, fontWeight: 700 }}>●</span> nota del acorde · Las formas de barre se trasladan subiendo el traste.
            </div>
          </div>
        )}

        {/* ── Modo escalas ── */}
        {mode === "scales" && (
          <div style={{ padding: "16px 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "10px", marginBottom: "14px" }}>
              <div>
                <div style={{ ...microLabelStyle, marginBottom: "6px", color: C.magenta }}>TÓNICA</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "3px" }}>
                  {NOTES.map((n, i) => {
                    const sel = i === scaleRoot;
                    return (
                      <button key={n} onClick={() => setScaleRoot(i)} style={{ padding: "8px 2px", background: sel ? C.magenta : C.bgDeep, border: `1px solid ${sel ? C.magenta : C.border}`, borderRadius: "3px", color: sel ? C.bgDeep : C.textMid, fontSize: n.includes("#") ? "11px" : "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: sel ? `0 0 10px ${C.magenta}88` : "none" }}>{n}</button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div style={{ ...microLabelStyle, marginBottom: "6px", color: C.magenta }}>ESCALA</div>
                <select value={scaleName} onChange={(e) => setScaleName(e.target.value)} style={{ width: "100%", padding: "10px 8px", background: C.bgDeep, border: `1px solid ${C.border}`, borderRadius: "3px", color: C.cyan, fontSize: "14px", fontWeight: 700, fontFamily: "inherit", letterSpacing: "1px", cursor: "pointer" }}>
                  {Object.keys(SCALES).map((s) => (<option key={s} value={s} style={{ background: C.bgDeep }}>{s}</option>))}
                </select>
                <div style={{ marginTop: "8px", display: "flex", gap: "4px", flexWrap: "wrap" }}>
                  {SCALES[scaleName].map((iv) => (
                    <span key={iv} style={{ padding: "4px 8px", background: `${C.cyan}1a`, border: `1px solid ${C.cyan}`, borderRadius: "3px", color: C.cyan, fontSize: "12px", fontWeight: 700 }}>{NOTES[(iv + scaleRoot) % 12]}</span>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ ...labelStyle, marginBottom: "8px" }}>MÁSTIL</div>
            <Fretboard rootIndex={scaleRoot} scaleIntervals={SCALES[scaleName]} />
            <div style={{ marginTop: "12px", padding: "10px 14px", background: C.bgDeep, border: `1px solid ${C.border}`, borderRadius: "3px", fontSize: "12px", color: C.textMid, letterSpacing: "1px", lineHeight: "1.6" }}>
              <span style={{ color: C.magenta, fontWeight: 700 }}>●</span> tónica · <span style={{ color: C.cyan, fontWeight: 700 }}>●</span> nota de la escala · 12 trastes en orden estándar (1ª cuerda arriba).
            </div>
          </div>
        )}

        {/* ── Modo intervalos ── */}
        {mode === "intervals" && (
          <div style={{ padding: "16px 24px" }}>
            <IntervalView noteA={intervalA} noteB={intervalB} setNoteA={setIntervalA} setNoteB={setIntervalB} />
          </div>
        )}

        {/* ── Botón activar ── */}
        {mode === "tuner" && (
          <div style={{ padding: "0 24px 20px" }}>
            <button onClick={active ? stopAudio : startAudio} style={{ width: "100%", padding: "16px", background: active ? "transparent" : C.cyan, color: active ? C.red : C.bgDeep, border: `1px solid ${active ? C.red : C.cyan}`, borderRadius: "3px", fontSize: "14px", letterSpacing: "3px", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, transition: "all 0.2s", textTransform: "uppercase", boxShadow: active ? `0 0 14px ${C.red}55` : `0 0 14px ${C.cyan}77` }}>{active ? "DETENER" : "ACTIVAR MICROFONO"}</button>
          </div>
        )}
        {(mode === "scales" || mode === "intervals") && <div style={{ padding: "0 0 12px" }} />}

        {error && (
          <div style={{ margin: "0 24px 20px", padding: "12px 16px", background: `${C.red}10`, border: `1px solid ${C.red}`, borderRadius: "3px", color: C.red, fontSize: "13px", letterSpacing: "1px", fontWeight: 600 }}>{error}</div>
        )}

        {/* ── Footer ── */}
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 24px", display: "flex", justifyContent: "space-between", fontSize: "11px", color: C.textDim, letterSpacing: "2px", fontWeight: 600 }}>
          <span>WEB AUDIO API</span>
          <span style={{ color: C.violet }}>YIN + EMA SMOOTH</span>
          <span>12-TET</span>
        </div>
      </div>
    </div>
  );
}
