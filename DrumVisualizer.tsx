import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Midi } from "@tonejs/midi";
import AICoachPanel from "../ai/AICoachPanel";
import { useDrumFeedback, DrumFeedbackPanel } from "./DrumFeedbackSystem";

// =====================================================
// SINGLETON AUDIO ELEMENT - Survives Hot Module Reload
// =====================================================
// This solves the critical bug where HMR creates a new audio element
// while the old one keeps playing, causing scoring to fail.
declare global {
  interface Window {
    __drumPlayerAudio?: HTMLAudioElement;
    __drumPlayerCleanup?: () => void;
  }
}

function getOrCreateAudioElement(): HTMLAudioElement {
  // Reuse existing audio element if it exists
  if (window.__drumPlayerAudio) {
    console.log("[Audio] Reusing existing singleton audio element");
    return window.__drumPlayerAudio;
  }
  
  // Create new singleton audio element
  console.log("[Audio] Creating new singleton audio element");
  const audio = document.createElement('audio');
  audio.id = 'drum-player-audio';
  audio.controls = false;
  audio.preload = 'auto';
  
  window.__drumPlayerAudio = audio;
  
  // HMR cleanup
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      console.log("[Audio] HMR dispose - keeping audio element");
      // Don't destroy the audio, just keep it around
    });
  }
  
  return audio;
}

// Cleanup any orphaned audio elements from failed HMR
function cleanupOrphanedAudioElements() {
  const orphans = document.querySelectorAll('audio:not(#drum-player-audio)');
  orphans.forEach((el) => {
    const audio = el as HTMLAudioElement;
    if (!audio.paused) {
      console.log("[Audio] Pausing orphaned audio element");
      audio.pause();
    }
  });
}

type LaneKey =
  | "kick"
  | "snare"
  | "hihat"
  | "tom1"
  | "tom2"
  | "floor"
  | "crash"
  | "ride";

interface Note {
  time: number;
  lane: LaneKey;
}

interface Song {
  name: string;
  audio: string;
  midi: string;
  defaultOffset: number;
  genre?: "Rock" | "Pop" | "Metal" | "HipHop" | "Electronic";
  cover?: string;
}

type Difficulty = "Nybörjare" | "Medium" | "Full";

const SONGS: Song[] = [
  {
    name: "Crazy Train - Ozzy Osbourne",
    audio: "/crazy_train.mp3",
    midi: "/crazy_train.mid",
    defaultOffset: 3000,
    genre: "Rock",
    cover: "/covers/crazy_train.jpg",
  },
  {
    name: "Back in Black - AC/DC",
    audio: "/back_in_black.mp3",
    midi: "/back_in_black.mid",
    defaultOffset: 600,
    genre: "Rock",
    cover: "/covers/back_in_black.jpg",
  },
  {
    name: "Signal",
    audio: "/signal.mp3",
    midi: "/signal.mid",
    defaultOffset: 46000,
    genre: "pop",
    cover: "/covers/electric.jpg",
  },
];

const LANES: { key: LaneKey; color: string; label: string }[] = [
  { key: "crash", color: "#fca5a5", label: "Crash" },
  { key: "hihat", color: "#fbbf24", label: "Hi-Hat" },
  { key: "snare", color: "#3b82f6", label: "Snare" },
  { key: "tom1", color: "#22d3ee", label: "Tom 1" },
  { key: "tom2", color: "#34d399", label: "Tom 2" },
  { key: "floor", color: "#a78bfa", label: "Floor" },
  { key: "kick", color: "#ef4444", label: "Kick" },
  { key: "ride", color: "#fde68a", label: "Ride" },
];

const GM_TO_LANE: Record<number, LaneKey> = {
  35: "kick",
  36: "kick",
  38: "snare",
  40: "snare",
  42: "hihat",
  44: "hihat",
  46: "hihat",
  48: "tom1",
  50: "tom1",
  45: "tom2",
  47: "tom2",
  41: "floor",
  43: "floor",
  49: "crash",
  57: "crash",
  55: "crash",
  51: "ride",
  59: "ride",
  53: "ride",
};

export default function DrumVisualizer() {
  // Use singleton audio element that survives hot reload
  // Note: useRef initial value is only set on first mount, so we update it manually
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContainerRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLAudioElement | null>(null); // för förhandsgranskning
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Always ensure audioRef points to the singleton
  if (!audioRef.current) {
    audioRef.current = getOrCreateAudioElement();
  }

  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [latencyMs, setLatencyMs] = useState(0);
  const [selectedSong, setSelectedSong] = useState<Song>(SONGS[0]);
  const [laneOrder, setLaneOrder] = useState<LaneKey[]>(
    LANES.map((l) => l.key) as LaneKey[]
  );
  const [difficulty, setDifficulty] = useState<Difficulty>("Full");
  const [editMode, setEditMode] = useState(false);
  const [firstPad, setFirstPad] = useState<LaneKey | null>(null);
  const [instruction, setInstruction] = useState("");
  const [hideKick, setHideKick] = useState(false);

  // Album/genre UI
  const [showGenrePicker, setShowGenrePicker] = useState<boolean>(false);
  const [activeGenre, setActiveGenre] =
    useState<NonNullable<Song["genre"]>>("Rock");

  // Feedback system
  const feedback = useDrumFeedback();
  const [showFeedback, setShowFeedback] = useState(true);
  const [hitLanes, setHitLanes] = useState<Partial<Record<LaneKey, number>>>({});

  const WIDTH = 900;
  const HEIGHT = 420;
  const TOP_Y = 100;
  const HIT_Y = HEIGHT - 105;
  const NOTE_SPEED = 240;
  const TOP_SCALE = 0.55;

  const slots = padSlots(WIDTH);
  const bottomX = bottomXFromOrder(slots, laneOrder);

  const topX = Object.fromEntries(
    laneOrder.map((k) => {
      const bx = bottomX[k];
      const cx = WIDTH / 2;
      const tx = cx + (bx - cx) * TOP_SCALE;
      return [k, tx];
    })
  ) as Record<LaneKey, number>;

  const rafId = useRef<number | undefined>(undefined);

  // lås body-scroll när overlayen är öppen
  useEffect(() => {
    if (!showGenrePicker) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showGenrePicker]);

  // Koppla notes till feedback-systemet
  useEffect(() => {
    const offset = latencyMs / 1000;
    const adjustedNotes = allNotes.map(n => ({ ...n, time: n.time + offset }));
    feedback.setNotesToTrack(adjustedNotes);
  }, [allNotes, latencyMs, feedback]);

  // Mount singleton audio element into DOM and attach to feedback system
  useEffect(() => {
    const audio = audioRef.current;
    
    console.log("[DrumViz] Mount effect running, audio:", audio ? "exists" : "null");
    
    // Cleanup orphaned audio elements from failed HMR
    cleanupOrphanedAudioElements();
    
    // Wait for container to be available
    const tryMount = () => {
      const container = audioContainerRef.current;
      console.log("[DrumViz] tryMount: container=", container ? "found" : "null", "audio=", audio ? "exists" : "null");
      
      if (container && audio) {
        // Append singleton to container if not already there
        if (!container.contains(audio)) {
          audio.controls = true;
          audio.className = "flex-1 max-w-xs sm:max-w-md ui-element";
          container.appendChild(audio);
          console.log("[DrumViz] Mounted singleton audio element");
        }
        
        // Set initial src if not set
        if (!audio.src && selectedSong) {
          audio.src = selectedSong.audio;
          console.log("[DrumViz] Set initial audio src:", selectedSong.audio);
        }
        
        // Attach to feedback system
        console.log("[DrumViz] Attaching audio. State: paused=", audio.paused, "time=", audio.currentTime.toFixed(2));
        feedback.attachAudioElement(audio);
        
        // Sync isPlaying state with actual audio state
        setIsPlaying(!audio.paused);
        return true;
      }
      return false;
    };
    
    // Try immediately, then retry after a short delay if needed
    if (!tryMount()) {
      const timer = setTimeout(tryMount, 100);
      return () => clearTimeout(timer);
    }
    
    return () => {
      // Don't remove audio from DOM on unmount - keep it for hot reload
      // Just detach from feedback system
      feedback.attachAudioElement(null);
    };
  }, [feedback, selectedSong]);

  // Hantera drum hits från feedback-systemet
  useEffect(() => {
    feedback.onDrumHit((lane: LaneKey, _time: number) => {
      setHitLanes(prev => ({ ...prev, [lane]: Date.now() }));
      setTimeout(() => {
        setHitLanes(prev => {
          const copy = { ...prev };
          delete copy[lane];
          return copy;
        });
      }, 200);
    });
  }, [feedback]);

  // === Rita Canvas ===
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d")!;

    const draw = () => {
      const now = audioRef.current?.currentTime ?? 0;

      const bgGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      bgGrad.addColorStop(0, "#0f172a");
      bgGrad.addColorStop(1, "#0b1325");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      for (const { key, color } of LANES) {
        if (!laneOrder.includes(key)) continue;
        if (hideKick && key === "kick") continue;
        const bx = bottomX[key];
        const tx = topX[key];
        const grad = ctx.createLinearGradient(tx, TOP_Y, bx, HIT_Y);
        grad.addColorStop(0, `${color}66`);
        grad.addColorStop(1, `${color}22`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tx, TOP_Y);
        ctx.lineTo(bx, HIT_Y);
        ctx.stroke();
      }

      drawTopLegend(ctx, laneOrder, topX, TOP_Y);

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.shadowBlur = 22;
      ctx.shadowColor = "#3b82f6aa";
      ctx.beginPath();
      ctx.moveTo(0, HIT_Y);
      ctx.lineTo(WIDTH, HIT_Y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      const offset = latencyMs / 1000;
      const highlight: Partial<Record<LaneKey, boolean>> = {};
      
      // Inkludera hitLanes för visuell feedback från feedback-systemet
      for (const lane of Object.keys(hitLanes) as LaneKey[]) {
        highlight[lane] = true;
      }
      
      const base = applyDifficulty(allNotes, difficulty);
      const stream = (
        hideKick ? base.filter((n) => n.lane !== "kick") : base
      ).filter((n) => laneOrder.includes(n.lane));

      for (const n of stream) {
        const t = n.time + offset;
        const y = travelY(now, t, NOTE_SPEED, TOP_Y);
        if (y < TOP_Y - 12 || y > HIT_Y + 12) continue;
        const bx = bottomX[n.lane];
        const tx = topX[n.lane];
        const x = lerp(tx, bx, (y - TOP_Y) / (HIT_Y - TOP_Y));
        drawNote(ctx, x, y, n.lane);
        if (Math.abs(y - HIT_Y) <= 12) highlight[n.lane] = true;
      }

      drawDrumPads(ctx, bottomX, HIT_Y, highlight, laneOrder, hideKick);
      rafId.current = requestAnimationFrame(draw);
    };

    rafId.current = requestAnimationFrame(draw);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [allNotes, latencyMs, laneOrder, difficulty, hideKick, hitLanes]);

  const togglePlay = async () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      await audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Preview-kontroller
  const stopPreview = () => {
    if (previewRef.current) {
      previewRef.current.pause();
      previewRef.current.currentTime = 0;
    }
  };

  const previewSong = async (song: Song) => {
    try {
      stopPreview();
      if (previewRef.current) {
        previewRef.current.src = song.audio;
        await previewRef.current.play();
      }
    } catch (e) {
      console.warn("Kunde inte förhandsgranska:", e);
    }
  };

  const chooseSong = async (song: Song) => {
    stopPreview();
    await loadSong(song);
    setShowGenrePicker(false);
  };

  const loadSong = async (song: Song) => {
    setSelectedSong(song);
    if (audioRef.current) {
      audioRef.current.src = song.audio;
      await audioRef.current.load();
    }

    try {
      const res = await fetch(song.midi);
      if (!res.ok) throw new Error(`Kunde inte hämta MIDI: ${song.midi}`);
      const buf = await res.arrayBuffer();
      const midi = new Midi(buf);
      const parsed: Note[] = [];

      midi.tracks.forEach((tr) =>
        tr.notes.forEach((nt) => {
          if (GM_TO_LANE[nt.midi]) {
            const bpm = midi.header.tempos?.[0]?.bpm || 120;
            const t =
              nt.time && nt.time > 0
                ? nt.time
                : (nt.ticks / midi.header.ppq) * (60 / bpm);
            parsed.push({ time: t, lane: GM_TO_LANE[nt.midi] });
          }
        })
      );

      parsed.sort((a, b) => a.time - b.time);
      setAllNotes(parsed);
      setLatencyMs(song.defaultOffset);
    } catch (err) {
      console.error(err);
      setAllNotes([]);
    }
  };

  useEffect(() => {
    loadSong(SONGS[0]);
  }, []);

  const onPadClick = (lane: LaneKey) => {
    if (!editMode) return;
    if (!firstPad) {
      setFirstPad(lane);
      setInstruction("Klicka på den pad du vill byta plats med.");
    } else {
      const a = laneOrder.indexOf(firstPad);
      const b = laneOrder.indexOf(lane);
      if (a !== -1 && b !== -1 && a !== b) {
        const newOrder = [...laneOrder];
        [newOrder[a], newOrder[b]] = [newOrder[b], newOrder[a]];
        setLaneOrder(newOrder);
      }
      setFirstPad(null);
      setInstruction("Klicka på en pad du vill flytta.");
    }
  };

  const resetPads = () => {
    setLaneOrder(LANES.map((l) => l.key) as LaneKey[]);
    setInstruction("Pads återställda.");
  };

  return (
    <div className="px-2">
      <div className="mb-2 text-sm text-gray-300 text-center">
        Ladda upp en låt och se exakt när du ska slå på Kick, Snare, HiHat, Toms,
        Crash & Ride.
      </div>

      <div className="mb-4 flex flex-wrap gap-3 justify-center items-center">
        {/* Öppna genre/album */}
        <button className="blue-btn" onClick={() => setShowGenrePicker(true)}>
          📀 Välj genre & album
        </button>

        <label className="text-white mr-2">🎵 Välj låt:</label>
        <select
          className="ui-element"
          value={selectedSong.name}
          onChange={(e) => {
            const song = SONGS.find((s) => s.name === e.target.value);
            if (song) loadSong(song);
          }}
        >
          {SONGS.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>

        <button onClick={() => setHideKick((v) => !v)} className="blue-btn">
          {hideKick ? "Visa Kick" : "Spela utan Kick"}
        </button>

        <button
          onClick={() => {
            setEditMode((v) => !v);
            setInstruction("Klicka på en pad du vill flytta.");
          }}
          className="blue-btn"
        >
          {editMode ? "Avsluta flyttning" : "Flytta pads"}
        </button>

        {editMode && (
          <button onClick={resetPads} className="blue-btn subtle">
            Återställ position
          </button>
        )}

        <div className="flex items-center gap-2">
          <label className="text-white">Svårighetsgrad:</label>
          <select
            className="ui-element"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          >
            <option>Nybörjare</option>
            <option>Medium</option>
            <option>Full</option>
          </select>
        </div>

        <button 
          onClick={() => setShowFeedback(v => !v)} 
          className={`blue-btn ${showFeedback ? '' : 'subtle'}`}
          data-testid="button-toggle-feedback"
        >
          {showFeedback ? "🎤 Dölj Feedback" : "🎤 Visa Feedback"}
        </button>
      </div>

      {editMode && (
        <div className="text-blue-400 text-lg mb-3 text-center font-semibold">
          {instruction}
        </div>
      )}

      <div className="mt-2 flex flex-wrap justify-center items-center gap-4">
        {/* Container for singleton audio element - survives hot reload */}
        <div 
          ref={audioContainerRef} 
          className="flex-1 max-w-xs sm:max-w-md"
          data-testid="audio-container"
        />
        <button onClick={togglePlay} className="blue-btn play">
          {isPlaying ? "⏸ Pausa" : "▶ Spela"}
        </button>
      </div>

      <div className="mt-3 text-sm text-gray-300 text-center">
        <label className="mr-2">Timing-offset (sek):</label>
        <input
          type="number"
          step={0.05}
          value={(latencyMs / 1000).toFixed(2)}
          onChange={(e) => setLatencyMs(parseFloat(e.target.value) * 1000)}
          className="ui-element w-20 text-center mr-3"
        />
        <input
          type="range"
          min={-5000}
          max={5000}
          step={50}
          value={latencyMs}
          onChange={(e) => setLatencyMs(parseInt(e.target.value))}
          className="slider"
        />
      </div>

      {/* Main content with canvas and feedback panel */}
      <div className="mt-6 flex flex-wrap justify-center gap-6" style={{ maxWidth: "1400px", margin: "24px auto 0" }}>
        {/* Canvas */}
        <div
          className="rounded-md overflow-hidden relative neon-border"
          style={{ flex: "1 1 auto", maxWidth: "900px", minWidth: "300px" }}
        >
          <div style={{ width: "100%", aspectRatio: "900/420" }}>
            <canvas
              ref={canvasRef}
              width={WIDTH}
              height={HEIGHT}
              style={{
                width: "100%",
                height: "100%",
                display: "block",
                objectFit: "contain",
              }}
              onClick={(e) => {
                if (!editMode) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const lane = findClosestLane(bottomX, x);
                if (lane) onPadClick(lane);
              }}
            />
          </div>
        </div>

        {/* Feedback Panel */}
        {showFeedback && (
          <div style={{ flex: "0 0 auto", width: "100%", maxWidth: "400px" }}>
            <DrumFeedbackPanel feedback={feedback} />
          </div>
        )}
      </div>

      {/* 🔊 dold spelare för förhandsgranskning */}
      <audio ref={previewRef} style={{ display: "none" }} />

      {/* 🤖 Ny AI-coach-panel med chat + tips */}
      <AICoachPanel />

      {/* GENRE/ALBUM OVERLAY via PORTAL + inline styles */}
      {showGenrePicker &&
        createPortal(
          <div
            className="album-overlay"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              display: "grid",
              placeItems: "center",
              background: "rgba(3, 6, 20, 0.72)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            <div
              className="album-modal"
              style={{
                width: "min(980px, 94vw)",
                maxHeight: "86vh",
                overflow: "hidden",
                color: "#e5e7eb",
                background:
                  "radial-gradient(140% 120% at 100% 0%, rgba(99,102,241,.22), transparent 60%), linear-gradient(180deg, rgba(22,28,50,.98), rgba(10,14,28,.98))",
                border: "1px solid rgba(99,102,241,.45)",
                borderRadius: 18,
                boxShadow:
                  "0 50px 140px rgba(0,0,0,.65), 0 0 0 1px rgba(99,102,241,.25) inset",
                padding: 18,
                transformOrigin: "center",
                animation: "modalPop .28s cubic-bezier(.22,.9,.2,1.1) both",
              }}
            >
              <style>{`
                @keyframes modalPop {
                  0% { opacity:0; transform: translateY(22px) scale(.94); }
                  60% { opacity:1; transform: translateY(0) scale(1.02); }
                  100% { opacity:1; transform: translateY(0) scale(1); }
                }
              `}</style>

              <div
                className="album-header"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontWeight: 800,
                    letterSpacing: ".2px",
                    color: "#c7d2fe",
                  }}
                >
                  Välj genre
                </h3>
                <button
                  className="album-close"
                  onClick={() => {
                    stopPreview();
                    setShowGenrePicker(false);
                  }}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#93c5fd",
                    fontSize: 20,
                    lineHeight: 1,
                    cursor: "pointer",
                    padding: "6px 8px",
                    borderRadius: 10,
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Genres */}
              <div
                className="genre-row"
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  margin: "8px 2px 14px",
                }}
              >
                {(["Rock", "Pop", "Metal", "HipHop", "Electronic"] as const).map(
                  (g) => {
                    const hasSongs = SONGS.some((s) => s.genre === g);
                    const active = activeGenre === g;
                    return (
                      <button
                        key={g}
                        className={`genre-pill ${active ? "active" : ""}`}
                        onClick={() => setActiveGenre(g)}
                        disabled={!hasSongs}
                        title={!hasSongs ? "Inga låtar ännu" : ""}
                        style={{
                          border: "1px solid rgba(99,102,241,.38)",
                          background: active
                            ? "linear-gradient(90deg,#312e81,#1e40af)"
                            : "rgba(23,27,56,.7)",
                          color: "#dbeafe",
                          padding: "7px 14px",
                          borderRadius: 999,
                          cursor: hasSongs ? "pointer" : "not-allowed",
                          fontWeight: 700,
                          fontSize: ".92rem",
                          opacity: hasSongs ? 1 : 0.45,
                        }}
                      >
                        {g}
                      </button>
                    );
                  }
                )}
              </div>

              {/* Albumgrid */}
              <div
                className="album-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: 16,
                  padding: "8px 4px 4px",
                  overflow: "auto",
                  maxHeight: "65vh",
                }}
              >
                {SONGS.filter((s) => s.genre === activeGenre).map((s) => (
                  <div
                    className="album-card"
                    key={s.name}
                    style={{
                      background: "rgba(255,255,255,.045)",
                      border: "1px solid rgba(99,102,241,.28)",
                      borderRadius: 16,
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div
                      className="album-cover"
                      style={{
                        position: "relative",
                        aspectRatio: "1 / 1",
                        background: s.cover
                          ? `url(${s.cover}) center/cover no-repeat`
                          : "radial-gradient(120% 120% at 80% 0%, rgba(99,102,241,.32), transparent 60%), linear-gradient(180deg, rgba(18,26,48,1), rgba(9,14,30,1))",
                        borderBottom: "1px solid rgba(99,102,241,.25)",
                      }}
                      aria-label={s.name}
                    >
                      {!s.cover && (
                        <span
                          className="album-fallback"
                          style={{
                            position: "absolute",
                            left: 12,
                            right: 12,
                            bottom: 12,
                            color: "#e5e7eb",
                            fontWeight: 800,
                            fontSize: ".95rem",
                            lineHeight: 1.25,
                            textShadow: "0 2px 10px rgba(0,0,0,.55)",
                          }}
                        >
                          {s.name}
                        </span>
                      )}
                    </div>

                    <div
                      className="album-meta"
                      style={{
                        padding: 12,
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      <div
                        className="album-title"
                        style={{
                          color: "#e5e7eb",
                          fontWeight: 800,
                          minHeight: 42,
                          lineHeight: 1.3,
                          letterSpacing: ".1px",
                        }}
                      >
                        {s.name}
                      </div>
                      <div
                        className="album-actions"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 10,
                        }}
                      >
                        <button
                          className="blue-btn subtle"
                          onClick={() => previewSong(s)}
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            background: "linear-gradient(90deg,#0f172a,#1e293b)",
                            border: "1px solid rgba(99,102,241,.35)",
                            borderRadius: 8,
                            color: "#dbeafe",
                          }}
                        >
                          ▶ Förhandsgranska
                        </button>
                        <button
                          className="blue-btn"
                          onClick={() => chooseSong(s)}
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: 8,
                            background: "linear-gradient(90deg,#1e3a8a,#2563eb)",
                            color: "#fff",
                          }}
                        >
                          Välj
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {SONGS.filter((s) => s.genre === activeGenre).length === 0 && (
                  <div
                    className="album-empty"
                    style={{
                      color: "#94a3b8",
                      padding: 22,
                      gridColumn: "1 / -1",
                      textAlign: "center",
                      border: "1px dashed rgba(99,102,241,.35)",
                      borderRadius: 12,
                    }}
                  >
                    Inga album i denna genre ännu.
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      <footer
        style={{
          width: "100%",
          marginTop: "2rem",
          padding: "2rem 1rem",
          background: "linear-gradient(180deg,#0f172a 0%,#1e293b 100%)",
          color: "white",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "2rem",
          }}
        >
          <div style={{ flex: "1 1 500px", textAlign: "center" }}>
            <img
              src="/images/drums/Hurduspelar.png"
              alt="Hur du spelar"
              style={{
                width: "100%",
                maxWidth: "900px",
                borderRadius: "12px",
                boxShadow: "0 0 40px rgba(0,128,255,0.3)",
              }}
            />
          </div>

          <div style={{ flex: "1 1 400px" }}>
            <h2
              style={{
                fontSize: "1.8rem",
                fontWeight: 700,
                marginBottom: "1rem",
              }}
            >
              Hur du spelar
            </h2>
            <p style={{ lineHeight: 1.6, marginBottom: "1rem" }}>
              Följ noterna som faller. När de träffar den vita linjen ska du slå
              på rätt trumdel. När du träffar rätt lyser den upp!
            </p>
            <p style={{ lineHeight: 1.6 }}>
              Justera svårighetsgrad och offset ovan för att synka perfekt med
              låten.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* === Hjälpfunktioner (oförändrade) === */
function padSlots(width: number): number[] {
  const pad = 70;
  const usable = width - pad * 2;
  const count = 8;
  const step = usable / (count - 1);
  return Array.from({ length: count }, (_, i) => pad + i * step);
}

function bottomXFromOrder(
  slots: number[],
  order: LaneKey[]
): Record<LaneKey, number> {
  const out: Partial<Record<LaneKey, number>> = {};
  order.forEach((k, i) => (out[k] = slots[i]));
  return out as Record<LaneKey, number>;
}

function findClosestLane(
  bottomX: Record<LaneKey, number>,
  x: number
): LaneKey | null {
  let best: LaneKey | null = null;
  let bestDist = Infinity;
  for (const [k, v] of Object.entries(bottomX)) {
    const d = Math.abs(v - x);
    if (d < bestDist) {
      bestDist = d;
      best = k as LaneKey;
    }
  }
  return best;
}

function applyDifficulty(src: Note[], level: Difficulty): Note[] {
  if (level === "Full") return src;
  const out: Note[] = [];
  for (const n of src) {
    if (level === "Nybörjare" && (n.lane === "snare" || n.lane === "hihat"))
      out.push(n);
    else if (
      level === "Medium" &&
      (n.lane === "snare" ||
        n.lane === "hihat" ||
        n.lane === "crash" ||
        n.lane === "tom1")
    )
      out.push(n);
  }
  return out;
}

function laneColor(l: LaneKey) {
  return LANES.find((x) => x.key === l)?.color || "#fff";
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function travelY(now: number, t0: number, speed: number, topY: number) {
  // nu: noterna faller nedåt från TOP_Y mot HIT_Y
  const dt = now - t0;
  return topY + dt * speed;
}

function drawNote(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  lane: LaneKey
) {
  ctx.fillStyle = laneColor(lane);
  ctx.shadowBlur = 8;
  ctx.shadowColor = laneColor(lane);
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawDrumPads(
  ctx: CanvasRenderingContext2D,
  bottomX: Record<LaneKey, number>,
  hitY: number,
  highlight: Partial<Record<LaneKey, boolean>>,
  order: LaneKey[],
  hideKick: boolean
) {
  const glow = (lane: LaneKey) => {
    ctx.shadowBlur = highlight[lane] ? 26 : 8;
    ctx.shadowColor = highlight[lane] ? laneColor(lane) : "#000000";
  };

  order.forEach((lane) => {
    if (hideKick && lane === "kick") return;
    glow(lane);
    const fillDark = "#1e293b";
    const stroke = highlight[lane] ? "#60a5fa" : "#334155";
    if (lane === "hihat" || lane === "crash" || lane === "ride")
      filledEllipse(ctx, bottomX[lane], hitY, 32, 10, fillDark, stroke);
    else filledCircle(ctx, bottomX[lane], hitY, 22, fillDark, stroke);
    ctx.shadowBlur = 0;
  });
}

function filledCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  f: string,
  s: string
) {
  ctx.fillStyle = f;
  ctx.strokeStyle = s;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function filledEllipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  f: string,
  s: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = f;
  ctx.strokeStyle = s;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawTopLegend(
  ctx: CanvasRenderingContext2D,
  order: LaneKey[],
  topX: Record<LaneKey, number>,
  TY: number
) {
  for (const k of order) {
    const { color, label } = LANES.find((l) => l.key === k)!;
    const tx = topX[k];
    ctx.fillStyle = "#fff";
    ctx.font = "600 17px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.fillText(label, tx, TY - 55);
    ctx.shadowBlur = 12;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(tx, TY - 30, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

/* === Neon-blå UI (självförsörjande stil) === */
const style = document.createElement("style");
style.innerHTML = `
.ui-element, .blue-btn, .slider {
  background: rgba(15,23,42,0.8);
  border: 1px solid #1e40af;
  border-radius: 6px;
  color: #dbeafe;
  padding: 6px 10px;
  font-size: 14px;
  transition: 0.2s;
  box-shadow: 0 0 6px rgba(59,130,246,0.25);
}
.ui-element:hover, .blue-btn:hover {
  border-color: #60a5fa;
  box-shadow: 0 0 14px rgba(96,165,250,0.6);
  color: #fff;
}
.blue-btn { cursor: pointer; background: linear-gradient(90deg,#1e3a8a,#2563eb); }
.blue-btn.play { background: linear-gradient(90deg,#1d4ed8,#3b82f6); }
.blue-btn.subtle { background: linear-gradient(90deg,#0f172a,#1e293b); }
.slider { accent-color: #3b82f6; width: 260px; height: 4px; border-radius: 4px; outline: none; }
.neon-border { box-shadow: 0 0 25px rgba(59,130,246,0.3); border: 1px solid rgba(59,130,246,0.5); }
`;
document.head.appendChild(style);
