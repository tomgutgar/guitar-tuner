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

const CHORD_TEMPLATES = {
  "E maj": [0, 4, 7], "E min": [0, 3, 7],
  "A maj": [9, 0, 4], "A min": [9, 0, 3],
  "D maj": [2, 6, 9], "D min": [2, 5, 9],
  "G maj": [7, 11, 2], "G min": [7, 10, 2],
  "C maj": [0, 4, 7], "C min": [0, 3, 7],
  "F maj": [5, 9, 0], "F min": [5, 8, 0],
  "B maj": [11, 3, 6], "B min": [11, 2, 6],
  "Em7": [0, 3, 7, 10], "Am7": [9, 0, 3, 7],
  "Dm7": [2, 5, 9, 0], "G7": [7, 11, 2, 5],
  "C maj7": [0, 4, 7, 11], "D7": [2, 6, 9, 0],
};

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
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1;

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
  if (bestLag < 0 || bestVal < 0.01) return -1;

  const x1 = r[bestLag - 1] || 0;
  const x2 = r[bestLag];
  const x3 = r[bestLag + 1] || 0;
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  const refinedLag = a !== 0 ? bestLag - b / (2 * a) : bestLag;

  return sampleRate / refinedLag;
}

function matchChord(noteIndices) {
  if (noteIndices.length < 2) return null;
  const unique = [...new Set(noteIndices)].sort((a, b) => a - b);
  let best = null;
  let bestScore = 0;
  for (const [name, intervals] of Object.entries(CHORD_TEMPLATES)) {
    for (let root = 0; root < 12; root++) {
      const chordNotes = intervals.map((i) => (i + root) % 12).sort((a, b) => a - b);
      const matches = unique.filter((n) => chordNotes.includes(n)).length;
      const score = matches / Math.max(unique.length, chordNotes.length);
      if (score > bestScore && score > 0.6) {
        bestScore = score;
        const rootNote = NOTES[root];
        best = name.replace(/^[A-G]#?/, rootNote);
      }
    }
  }
  return best;
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
        ctx.strokeStyle = "#1a3a2a"; ctx.lineWidth = 1;
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
      for (let y = 0; y < canvas.height; y += 3) {
        ctx.fillStyle = "rgba(0,20,10,0.15)";
        ctx.fillRect(0, y, canvas.width, 1);
      }
      ctx.lineWidth = 1.5; ctx.strokeStyle = "#00ff88";
      ctx.shadowBlur = 8; ctx.shadowColor = "#00ff88";
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

export default function GuitarTuner() {
  const [active, setActive] = useState(false);
  const [freq, setFreq] = useState(null);
  const [noteData, setNoteData] = useState(null);
  const [detectedNotes, setDetectedNotes] = useState([]);
  const [chord, setChord] = useState(null);
  const [mode, setMode] = useState("tuner");
  const [closestString, setClosestString] = useState(null);
  const [error, setError] = useState(null);

  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const streamRef = useRef(null);
  const animRef = useRef(null);
  const noteHistoryRef = useRef([]);
  const chordNotesRef = useRef([]);

  const stopAudio = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    if (sourceRef.current) sourceRef.current.disconnect();
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (audioCtxRef.current) audioCtxRef.current.close();
    audioCtxRef.current = null; analyserRef.current = null;
    sourceRef.current = null; streamRef.current = null;
    setActive(false); setFreq(null); setNoteData(null);
    setDetectedNotes([]); setChord(null);
    chordNotesRef.current = [];
  }, []);

  const startAudio = useCallback(async () => {
    try {
      if (!window.isSecureContext) {
        setError(`Contexto no seguro. Usa http://localhost o HTTPS. Origen: ${window.location.origin}`);
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Este navegador no expone navigator.mediaDevices.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        video: false,
      });
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") await audioCtx.resume();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0;
      const source = audioCtx.createMediaStreamSource(stream);
      const hp = audioCtx.createBiquadFilter();
      hp.type = "highpass"; hp.frequency.value = 70;
      const lp = audioCtx.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 1500;
      source.connect(hp); hp.connect(lp); lp.connect(analyser);
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
    function tick() {
      analyser.getFloatTimeDomainData(buffer);
      const detectedFreq = detectPitch(buffer, audioCtxRef.current.sampleRate);
      if (detectedFreq > 60 && detectedFreq < 1400) {
        setFreq(Math.round(detectedFreq * 10) / 10);
        const nd = freqToNote(detectedFreq);
        setNoteData(nd);
        const closest = STANDARD_TUNING.reduce((prev, curr) =>
          Math.abs(curr.freq - detectedFreq) < Math.abs(prev.freq - detectedFreq) ? curr : prev
        );
        setClosestString(closest);
        if (mode === "chord" && nd) {
          noteHistoryRef.current.push(nd.noteIndex);
          if (noteHistoryRef.current.length > 60) noteHistoryRef.current.shift();
          const recent = noteHistoryRef.current.slice(-30);
          const fmap = {};
          recent.forEach((n) => (fmap[n] = (fmap[n] || 0) + 1));
          const dominant = Object.entries(fmap).filter(([, v]) => v > 3).map(([k]) => parseInt(k));
          if (dominant.length !== chordNotesRef.current.length ||
            dominant.some((n, i) => n !== chordNotesRef.current[i])) {
            chordNotesRef.current = dominant;
            setDetectedNotes(dominant.map((i) => NOTES[i]));
            setChord(matchChord(dominant));
          }
        }
      } else {
        setFreq(null); setNoteData(null); setClosestString(null);
      }
      animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [active, mode]);

  const centsColor = noteData
    ? Math.abs(noteData.cents) < 5 ? "#00ff88"
      : Math.abs(noteData.cents) < 15 ? "#ffcc00" : "#ff4444"
    : "#333";
  const centsPercent = noteData ? Math.max(0, Math.min(100, (noteData.cents + 50) / 100 * 100)) : 50;

  return (
    <div style={{ minHeight: "100vh", background: "#080e0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Courier New', monospace", padding: "20px", boxSizing: "border-box" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 10, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)" }} />
      <div style={{ width: "100%", maxWidth: "560px", background: "linear-gradient(160deg, #0d1f14 0%, #080e0a 100%)", border: "1px solid #1a3a22", borderRadius: "4px", boxShadow: "0 0 60px rgba(0,255,100,0.04), inset 0 1px 0 rgba(0,255,100,0.05)", overflow: "hidden" }}>
        <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid #1a3a22", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: "#00ff88", fontSize: "10px", letterSpacing: "4px", marginBottom: "2px", opacity: 0.7 }}>CHROMATIC</div>
            <div style={{ color: "#e8f5ec", fontSize: "18px", letterSpacing: "2px", fontWeight: "bold" }}>TUNER / DETECTOR</div>
          </div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: active ? "#00ff88" : "#1a3a22", boxShadow: active ? "0 0 12px #00ff88" : "none", transition: "all 0.3s" }} />
            <span style={{ color: active ? "#00ff88" : "#2a5a35", fontSize: "10px", letterSpacing: "2px" }}>{active ? "LIVE" : "STANDBY"}</span>
          </div>
        </div>
        <div style={{ padding: "14px 24px 0", display: "flex", gap: "8px" }}>
          {["tuner", "chord"].map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{ padding: "6px 16px", background: mode === m ? "#00ff88" : "transparent", color: mode === m ? "#080e0a" : "#2a6a40", border: `1px solid ${mode === m ? "#00ff88" : "#1a3a22"}`, borderRadius: "2px", fontSize: "10px", letterSpacing: "2px", cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase", transition: "all 0.2s" }}>{m === "tuner" ? "AFINADOR" : "ACORDES"}</button>
          ))}
        </div>
        <div style={{ padding: "16px 24px 8px" }}>
          <div style={{ background: "#030a05", border: "1px solid #0d2015", borderRadius: "2px", padding: "8px", position: "relative", overflow: "hidden" }}>
            <Waveform analyser={analyserRef.current} active={active} />
            <div style={{ position: "absolute", top: "6px", left: "12px", fontSize: "8px", color: "#1a4a25", letterSpacing: "2px" }}>SIGNAL</div>
          </div>
        </div>
        {mode === "tuner" ? (
          <div style={{ padding: "16px 24px" }}>
            <div style={{ textAlign: "center", padding: "24px 0 16px", position: "relative" }}>
              <div style={{ fontSize: "88px", fontWeight: "bold", color: noteData ? centsColor : "#1a3a22", lineHeight: 1, letterSpacing: "-4px", transition: "color 0.15s", fontFamily: "'Courier New', monospace", textShadow: noteData ? `0 0 40px ${centsColor}40` : "none" }}>{noteData ? noteData.note : "--"}</div>
              {noteData && (<div style={{ color: "#2a5a35", fontSize: "14px", marginTop: "4px" }}>{noteData.octave}</div>)}
            </div>
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#1a4a25", letterSpacing: "2px", marginBottom: "6px" }}>
                <span>-50</span>
                <span style={{ color: noteData ? centsColor : "#1a4a25" }}>{noteData ? (noteData.cents > 0 ? `+${noteData.cents}` : noteData.cents) + " cts" : "0"}</span>
                <span>+50</span>
              </div>
              <div style={{ height: "6px", background: "#0d1f14", border: "1px solid #1a3a22", borderRadius: "1px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", left: "50%", top: 0, width: "2px", height: "100%", background: "#2a5a35", transform: "translateX(-50%)" }} />
                <div style={{ position: "absolute", left: `${centsPercent}%`, top: "0", width: "3px", height: "100%", background: centsColor, transform: "translateX(-50%)", boxShadow: `0 0 8px ${centsColor}`, transition: "left 0.1s, background 0.2s", borderRadius: "1px" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#030a05", border: "1px solid #0d2015", borderRadius: "2px", marginBottom: "16px" }}>
              <span style={{ color: "#1a4a25", fontSize: "9px", letterSpacing: "2px" }}>FREQ</span>
              <span style={{ color: "#00cc66", fontSize: "20px", letterSpacing: "2px", fontFamily: "monospace" }}>{freq ? `${freq.toFixed(1)} Hz` : "---.- Hz"}</span>
            </div>
            <div style={{ marginBottom: "8px" }}>
              <div style={{ color: "#1a4a25", fontSize: "9px", letterSpacing: "3px", marginBottom: "10px" }}>CUERDAS ESTANDAR</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "6px" }}>
                {STANDARD_TUNING.map((s) => {
                  const isClosest = closestString?.string === s.string;
                  const stringColor = isClosest ? (noteData ? centsColor : "#00ff88") : "#1a3a22";
                  return (
                    <div key={s.string} style={{ textAlign: "center", padding: "8px 4px", background: isClosest ? `${centsColor}10` : "#030a05", border: `1px solid ${isClosest ? centsColor : "#0d2015"}`, borderRadius: "2px", transition: "all 0.15s", boxShadow: isClosest ? `0 0 12px ${centsColor}20` : "none" }}>
                      <div style={{ color: stringColor, fontSize: "16px", fontWeight: "bold", lineHeight: 1 }}>{s.note}</div>
                      <div style={{ color: "#1a4a25", fontSize: "8px", marginTop: "3px" }}>{s.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: "16px 24px" }}>
            <div style={{ textAlign: "center", padding: "20px 0 12px" }}>
              <div style={{ color: "#1a4a25", fontSize: "9px", letterSpacing: "3px", marginBottom: "12px" }}>ACORDE DETECTADO</div>
              <div style={{ fontSize: "56px", fontWeight: "bold", color: chord ? "#00ff88" : "#1a3a22", lineHeight: 1, letterSpacing: "-1px", textShadow: chord ? "0 0 40px rgba(0,255,136,0.3)" : "none", transition: "all 0.2s", minHeight: "68px" }}>{chord || "---"}</div>
            </div>
            <div style={{ padding: "12px 14px", background: "#030a05", border: "1px solid #0d2015", borderRadius: "2px", marginBottom: "16px" }}>
              <div style={{ color: "#1a4a25", fontSize: "9px", letterSpacing: "2px", marginBottom: "8px" }}>NOTAS DETECTADAS</div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", minHeight: "32px" }}>
                {detectedNotes.length > 0 ? detectedNotes.map((n, i) => (
                  <span key={i} style={{ padding: "4px 10px", background: "#0a2010", border: "1px solid #1a5a28", borderRadius: "2px", color: "#00cc66", fontSize: "13px", letterSpacing: "1px" }}>{n}</span>
                )) : (<span style={{ color: "#1a3a22", fontSize: "11px" }}>Toca la guitarra...</span>)}
              </div>
            </div>
            <div style={{ marginBottom: "8px" }}>
              <div style={{ color: "#1a4a25", fontSize: "9px", letterSpacing: "3px", marginBottom: "10px" }}>ESCALA CROMATICA</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "3px" }}>
                {NOTES.map((n) => {
                  const isActive = detectedNotes.includes(n);
                  return (
                    <div key={n} style={{ textAlign: "center", padding: "6px 2px", background: isActive ? "rgba(0,255,136,0.12)" : "#030a05", border: `1px solid ${isActive ? "#00ff88" : "#0d2015"}`, borderRadius: "2px", transition: "all 0.15s", boxShadow: isActive ? "0 0 8px rgba(0,255,136,0.2)" : "none" }}>
                      <div style={{ color: isActive ? "#00ff88" : "#1a4a25", fontSize: n.includes("#") ? "8px" : "9px", fontWeight: isActive ? "bold" : "normal" }}>{n}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ padding: "10px 14px", background: "#030a05", border: "1px solid #0d2015", borderRadius: "2px", fontSize: "9px", color: "#1a4a25", letterSpacing: "1px", lineHeight: "1.6" }}>Toca las cuerdas individualmente o el acorde completo. El detector analiza las notas dominantes en tiempo real.</div>
          </div>
        )}
        <div style={{ padding: "0 24px 20px", display: "flex", gap: "10px" }}>
          <button onClick={active ? stopAudio : startAudio} style={{ flex: 1, padding: "12px", background: active ? "transparent" : "#00ff88", color: active ? "#ff4444" : "#080e0a", border: `1px solid ${active ? "#ff4444" : "#00ff88"}`, borderRadius: "2px", fontSize: "10px", letterSpacing: "3px", cursor: "pointer", fontFamily: "inherit", fontWeight: "bold", transition: "all 0.2s", textTransform: "uppercase" }}>{active ? "DETENER" : "ACTIVAR MICROFONO"}</button>
          {active && mode === "chord" && (
            <button onClick={() => { chordNotesRef.current = []; noteHistoryRef.current = []; setDetectedNotes([]); setChord(null); }} style={{ padding: "12px 16px", background: "transparent", color: "#2a5a35", border: "1px solid #1a3a22", borderRadius: "2px", fontSize: "9px", letterSpacing: "2px", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>RESET</button>
          )}
        </div>
        {error && (<div style={{ margin: "0 24px 20px", padding: "10px 14px", background: "rgba(255,68,68,0.06)", border: "1px solid #3a1515", borderRadius: "2px", color: "#ff6666", fontSize: "10px", letterSpacing: "1px" }}>{error}</div>)}
        <div style={{ borderTop: "1px solid #0d2015", padding: "10px 24px", display: "flex", justifyContent: "space-between", fontSize: "8px", color: "#1a3a22", letterSpacing: "2px" }}>
          <span>WEB AUDIO API</span>
          <span>AUTOCORRELACION</span>
          <span>12-TET</span>
        </div>
      </div>
    </div>
  );
}
