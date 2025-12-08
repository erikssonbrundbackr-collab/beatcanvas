import React, { useEffect, useRef, useState } from "react";
import Soundfont from "soundfont-player";
import "./PianoTrainer.css";

interface Note {
  time: number;
  name: string;
}

interface Section {
  id: number;
  label: string;
  start: number;
  end: number;
}

interface Song {
  name: string;
  midi: string;
  sections: Section[];
  defaultOffset: number;
}

const SONGS: Song[] = [
  {
    name: "Wonderwall – Oasis",
    midi: "/Wonderwall_Oasis_Piano.mid",
    defaultOffset: 800,
    sections: [
      { id: 1, label: "Intro", start: 0, end: 15 },
      { id: 2, label: "Vers 1", start: 15, end: 40 },
      { id: 3, label: "Refräng", start: 40, end: 70 },
      { id: 4, label: "Brygga", start: 70, end: 100 },
      { id: 5, label: "Slut", start: 100, end: 130 },
    ],
  },
  {
    name: "Für Elise – Beethoven",
    midi: "/fur_elise.mid",
    defaultOffset: 1000,
    sections: [
      { id: 1, label: "Intro", start: 0, end: 10 },
      { id: 2, label: "Tema A", start: 10, end: 30 },
      { id: 3, label: "Tema B", start: 30, end: 50 },
      { id: 4, label: "Tema C", start: 50, end: 80 },
      { id: 5, label: "Slut", start: 80, end: 110 },
    ],
  },
];

const KEYS = [
  "A1","A#1","B1","C2","C#2","D2","D#2","E2","F2","F#2","G2","G#2",
  "A2","A#2","B2","C3","C#3","D3","D#3","E3","F3","F#3","G3","G#3",
  "A3","A#3","B3","C4","C#4","D4","D#4","E4","F4","F#4","G4","G#4",
  "A4","A#4","B4","C5","C#5","D5","D#5","E5","F5","F#5","G5","G#5",
  "A5","A#5","B5","C6"
];

export default function PianoTrainer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song>(SONGS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [latency, setLatency] = useState(0);
  const [tempo, setTempo] = useState(1);
  const [color, setColor] = useState("#3b82f6");
  const [mute, setMute] = useState(false);
  const [instrument, setInstrument] = useState<any>(null);
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<Section>(SONGS[0].sections[0]);
  const [showControls, setShowControls] = useState(true);

  const HEIGHT = 480;
  const WIDTH = 1300;
  const NOTE_SPEED = 170;

  // === INIT Soundfont ===
  useEffect(() => {
    Soundfont.instrument(new AudioContext(), "acoustic_grand_piano").then(setInstrument);
  }, []);

  // === Ladda MIDI ===
  useEffect(() => {
    import("@tonejs/midi").then(({ Midi }) => {
      fetch(selectedSong.midi)
        .then((r) => r.arrayBuffer())
        .then((b) => {
          const midi = new Midi(b);
          const parsed: Note[] = [];
          midi.tracks.forEach((t) =>
            t.notes.forEach((n) => parsed.push({ time: n.time, name: n.name }))
          );
          parsed.sort((a, b) => a.time - b.time);
          setNotes(parsed);
          setLatency(selectedSong.defaultOffset);
          setActiveSection(selectedSong.sections[0]);
        });
    });
  }, [selectedSong]);

  // === Rita pianot ===
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d")!;
    const keyWidth = WIDTH / KEYS.length;
    let frame: number;
    let start = performance.now();

    const draw = (timestamp: number) => {
      const now = (timestamp - start) / 1000;
      ctx.fillStyle = "#030617";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Rita tangenter
      for (let i = 0; i < KEYS.length; i++) {
        const key = KEYS[i];
        const x = i * keyWidth;
        const isSharp = key.includes("#");
        ctx.fillStyle = isSharp ? "#111" : "#f9fafb";
        if (highlightKey === key) ctx.fillStyle = color;
        ctx.fillRect(x, HEIGHT - 150, keyWidth, 150);
        ctx.strokeStyle = "#1e3a8a";
        ctx.strokeRect(x, HEIGHT - 150, keyWidth, 150);
      }

      // Rita noter
      const offset = latency / 1000;
      const visible = notes.filter(
        (n) => n.time >= activeSection.start && n.time <= activeSection.end
      );

      for (const n of visible) {
        const y = (now - n.time - offset) * NOTE_SPEED * tempo;
        if (y < 0 || y > HEIGHT - 150) continue;
        const idx = KEYS.indexOf(n.name);
        if (idx === -1) continue;
        const x = idx * keyWidth;

        const grad = ctx.createLinearGradient(x, y, x, y + 20);
        grad.addColorStop(0, color);
        grad.addColorStop(1, "#1e3a8a");
        ctx.fillStyle = grad;
        ctx.shadowBlur = 12;
        ctx.shadowColor = color;
        ctx.fillRect(x, y, keyWidth, 12);
        ctx.shadowBlur = 0;

        // När noten träffar
        if (y > HEIGHT - 170 && y < HEIGHT - 140) {
          if (!mute && instrument) instrument.play(n.name, undefined, { gain: 0.4 });
          setHighlightKey(n.name);
          setTimeout(() => setHighlightKey(null), 150);
        }
      }

      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [notes, tempo, color, mute, instrument, activeSection, latency]);

  const nextSection = () => {
    const idx = selectedSong.sections.findIndex((s) => s.id === activeSection.id);
    if (idx < selectedSong.sections.length - 1)
      setActiveSection(selectedSong.sections[idx + 1]);
  };
  const prevSection = () => {
    const idx = selectedSong.sections.findIndex((s) => s.id === activeSection.id);
    if (idx > 0) setActiveSection(selectedSong.sections[idx - 1]);
  };

  return (
    <div className="trainer-container">
      <header className="trainer-header">
        <h1>🎹 BeatTrainer Learn Mode</h1>
        <p>Lär dig piano på riktigt — del för del, takt för takt.</p>
      </header>

      {showControls && (
        <div className="controls">
          <select
            className="dropdown"
            value={selectedSong.name}
            onChange={(e) =>
              setSelectedSong(SONGS.find((s) => s.name === e.target.value)!)
            }
          >
            {SONGS.map((s) => (
              <option key={s.name}>{s.name}</option>
            ))}
          </select>

          <button onClick={prevSection}>⏮ Föregående</button>
          <button onClick={() => setIsPlaying((p) => !p)}>
            {isPlaying ? "⏸ Pausa" : "▶ Spela"}
          </button>
          <button onClick={nextSection}>⏭ Nästa</button>
          <button onClick={() => setMute(!mute)}>
            {mute ? "🔈 Av" : "🔊 På"}
          </button>
          <button onClick={() => setShowControls(false)}>🕶 Dölj panel</button>

          <label>🎨 Färg:</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />

          <label>⚡ Tempo:</label>
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.05}
            value={tempo}
            onChange={(e) => setTempo(parseFloat(e.target.value))}
          />
        </div>
      )}

      {!showControls && (
        <button className="show-btn" onClick={() => setShowControls(true)}>
          🎛 Visa kontroller
        </button>
      )}

      <div className="canvas-wrapper">
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT}></canvas>
      </div>

      <div className="section-info">
        🎯 Aktiv sektion: <b>{activeSection.label}</b> ({activeSection.start}s – {activeSection.end}s)
      </div>

      <div className="tips">
        <h3>💡 Tips</h3>
        <p>1️⃣ Sänk tempot för att träna sakta.<br />
           2️⃣ Testa byta färg för fokus.<br />
           3️⃣ Använd hörlurar för bästa ljud.</p>
      </div>

      <footer className="footer">
        <p>© 2025 Stylexs — PianoTrainer v4.0 av Robin Eriksson</p>
      </footer>
    </div>
  );
}
