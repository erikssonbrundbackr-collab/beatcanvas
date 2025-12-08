import React, { useRef, useEffect, useState } from "react";
import { Midi } from "@tonejs/midi";
import Soundfont from "soundfont-player";
import "./GuitarTrainer.css";

/**
 * 🎸 GuitarTrainer v4.0
 * By Robin Eriksson (Stylexs)
 * - Dynamisk gitarrgreppbräda
 * - Canvas-renderad animation
 * - Spelbara MIDI-noter i realtid
 * - Responsiv design
 */

interface Note {
  time: number;
  string: number;
  fret: number;
}

interface Song {
  name: string;
  midi: string;
  defaultOffset: number;
}

const STRINGS = ["E", "B", "G", "D", "A", "E"];
const SONGS: Song[] = [
  { name: "Blackbird – The Beatles", midi: "/Blackbird_The_Beatles_Guitar_Tab_.mid", defaultOffset: 0 },
];

export default function GuitarTrainer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ctxAudio, setCtxAudio] = useState<AudioContext | null>(null);
  const [guitar, setGuitar] = useState<any>(null);

  const [notes, setNotes] = useState<Note[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tempo, setTempo] = useState(1);
  const [muted, setMuted] = useState(false);
  const [highlight, setHighlight] = useState<Note | null>(null);

  const WIDTH = 1200;
  const HEIGHT = 400;
  const FRET_COUNT = 12;
  const SPEED = 200; // px per sekund

  // === Ladda ljud ===
  useEffect(() => {
    (async () => {
      const ctx = new AudioContext();
      const guitar = await Soundfont.instrument(ctx, "acoustic_guitar_nylon");
      setCtxAudio(ctx);
      setGuitar(guitar);
    })();
  }, []);

  // === Ladda MIDI ===
  useEffect(() => {
    const loadMidi = async () => {
      const res = await fetch(SONGS[0].midi);
      const buf = await res.arrayBuffer();
      const midi = new Midi(buf);
      const parsed: Note[] = [];

      midi.tracks.forEach((track) =>
        track.notes.forEach((n) => {
          const string = Math.floor(Math.random() * 6); // temporärt
          const fret = Math.floor((n.midi - 40) % 12);
          parsed.push({ time: n.time, string, fret });
        })
      );
      parsed.sort((a, b) => a.time - b.time);
      setNotes(parsed);
    };
    loadMidi();
  }, []);

  // === Animation ===
  useEffect(() => {
    if (!canvasRef.current || !notes.length) return;
    const ctx = canvasRef.current.getContext("2d")!;
    const start = performance.now() / 1000;
    let raf: number;

    const draw = () => {
      const now = (performance.now() / 1000 - start) * tempo;
      const duration = notes[notes.length - 1]?.time + 3 || 10;
      const stringHeight = HEIGHT / STRINGS.length;

      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // Bakgrund + bräda
      const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
      gradient.addColorStop(0, "#0a0a23");
      gradient.addColorStop(1, "#111b3b");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Rita band (vertikala linjer)
      for (let i = 0; i <= FRET_COUNT; i++) {
        const x = (WIDTH / FRET_COUNT) * i;
        ctx.strokeStyle = i === 0 ? "#64748b" : "#1e293b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, HEIGHT);
        ctx.stroke();
      }

      // Rita strängar
      STRINGS.forEach((_, i) => {
        const y = i * stringHeight + stringHeight / 2;
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WIDTH, y);
        ctx.stroke();
      });

      // Rita noter som rullar från höger till vänster
      notes.forEach((n) => {
        const x = WIDTH - (now - n.time) * SPEED;
        if (x < -60 || x > WIDTH + 50) return;
        const y = n.string * stringHeight + stringHeight / 2;
        ctx.fillStyle = "#60a5fa";
        ctx.shadowColor = "#3b82f6";
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Rita siffra (fret)
        ctx.fillStyle = "#e0f2fe";
        ctx.font = "bold 16px Poppins";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${n.fret}`, x, y);

        // Träffmarkör
        if (x >= WIDTH / 2 - 10 && x <= WIDTH / 2 + 10) {
          setHighlight(n);
          if (!muted && guitar && ctxAudio)
            guitar.play(`E${n.fret}`, ctxAudio.currentTime, { duration: 0.4 });
        }
      });

      // Vertikal markör (spellys)
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(WIDTH / 2, 0);
      ctx.lineTo(WIDTH / 2, HEIGHT);
      ctx.stroke();

      // Highlight-info
      if (highlight) {
        ctx.fillStyle = "#93c5fd";
        ctx.font = "bold 18px Poppins";
        ctx.fillText(
          `Sträng ${STRINGS[highlight.string]} – Band ${highlight.fret}`,
          WIDTH / 2,
          30
        );
      }

      // Progress
      setProgress((now / duration) * 100);
      if (isPlaying && now < duration) raf = requestAnimationFrame(draw);
      else setIsPlaying(false);
    };

    if (isPlaying) raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, notes, muted, tempo]);

  return (
    <div className="guitar-container">
      <h1 className="title">🎸 BeatTrainer – GuitarTrainer</h1>

      <div className="controls">
        <button
          onClick={() => setIsPlaying((p) => !p)}
          className={isPlaying ? "pause" : "play"}
        >
          {isPlaying ? "⏸ Pausa" : "▶ Spela"}
        </button>
        <button className="stop" onClick={() => setIsPlaying(false)}>
          ⏹ Stop
        </button>
        <button
          className={muted ? "muted" : "sound"}
          onClick={() => setMuted((m) => !m)}
        >
          {muted ? "🔇 Ljud av" : "🔊 Ljud på"}
        </button>

        <label>Tempo: {tempo.toFixed(1)}x</label>
        <input
          type="range"
          min={0.5}
          max={1.5}
          step={0.1}
          value={tempo}
          onChange={(e) => setTempo(parseFloat(e.target.value))}
        />
      </div>

      <div className="canvas-wrap">
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT}></canvas>
      </div>

      <div className="progress-bar">
        <div className="progress" style={{ width: `${progress}%` }}></div>
      </div>

      <p className="mobile-tip">📱 Vänd mobilen horisontellt för bästa upplevelse.</p>
      <footer>© 2025 Stylexs — Gitarrvisualisering byggd av Robin Eriksson</footer>
    </div>
  );
}
