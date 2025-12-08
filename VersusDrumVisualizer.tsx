import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Midi } from "@tonejs/midi";
import { useDrumFeedback, DrumFeedbackPanel } from "./DrumFeedbackSystem";

// ==============================
// 🔊 Singleton-audio (delas mellan hot reloads)
// ==============================
declare global {
  interface Window {
    __drumBattleAudio?: HTMLAudioElement;
  }
}

function getOrCreateAudioElement(): HTMLAudioElement {
  if (window.__drumBattleAudio) return window.__drumBattleAudio;

  const audio = document.createElement("audio");
  audio.id = "drum-battle-audio";
  audio.controls = false; // osynlig – styrs från koden
  audio.preload = "auto";
  window.__drumBattleAudio = audio;
  return audio;
}

function cleanupOrphanedAudioElements() {
  const orphans = document.querySelectorAll(
    "audio:not(#drum-battle-audio)"
  ) as NodeListOf<HTMLAudioElement>;
  orphans.forEach((a) => {
    if (!a.paused) a.pause();
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
}

type Difficulty = "Nybörjare" | "Medium" | "Full";

const SONGS: Song[] = [
  {
    name: "Crazy Train - Ozzy Osbourne",
    audio: "/crazy_train.mp3",
    midi: "/crazy_train.mid",
    defaultOffset: 3000,
  },
  {
    name: "Back in Black - AC/DC",
    audio: "/back_in_black.mp3",
    midi: "/back_in_black.mid",
    defaultOffset: 600,
  },
  {
    name: "electric",
    audio: "/electric.mp3",
    midi: "/electric.mid",
    defaultOffset: 1000,
  },
  {
    name: "signal",
    audio: "/signal.mp3",
    midi: "/signal.mid",
    defaultOffset: 46000,
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

interface VersusDrumVisualizerProps {
  /** Vilken låt som ska spelas – måste matcha SONGS.name */
  songName?: string;
  /** Callback när poängen ändras (för versus-topbar) */
  onScoreChange?: (score: number) => void;
  /** När låten är färdigspelad */
  onSongEnd?: () => void;
}

export interface VersusDrumVisualizerHandle {
  startSong: () => void;
  pauseSong: () => void;
}

/**
 * Ren battle-version:
 * - bara canvas + DrumFeedbackPanel
 * - styrs utifrån via ref (startSong/pauseSong)
 */
const VersusDrumVisualizer = forwardRef<
  VersusDrumVisualizerHandle,
  VersusDrumVisualizerProps
>(({ songName, onScoreChange, onSongEnd }, ref) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [latencyMs, setLatencyMs] = useState(0);

  // I versus-läge låser vi svårighetsgrad & kick
  const difficulty: Difficulty = "Full";
  const hideKick = false;

  const [laneOrder] = useState<LaneKey[]>(LANES.map((l) => l.key) as LaneKey[]);
  const [hitLanes, setHitLanes] = useState<Partial<Record<LaneKey, number>>>(
    {}
  );
  const [score, setScore] = useState(0);

  const feedback = useDrumFeedback();

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

  const rafId = useRef<number | undefined>();

  // refs för scoring så callbacken alltid har senaste värdena
  const notesRef = useRef<Note[]>([]);
  const judgedRef = useRef<boolean[]>([]);
  const latencyRef = useRef(0);
  const onScoreChangeRef = useRef<typeof onScoreChange>();

  useEffect(() => {
    onScoreChangeRef.current = onScoreChange;
  }, [onScoreChange]);

  useEffect(() => {
    latencyRef.current = latencyMs;
  }, [latencyMs]);

  // Bygg upp "aktiva" noter för scoring när vi laddat ny låt
  useEffect(() => {
    const active = applyDifficulty(allNotes, difficulty);
    notesRef.current = active;
    judgedRef.current = active.map(() => false);
    setScore(0);
    onScoreChangeRef.current?.(0);
  }, [allNotes, difficulty]);

  // Mount audio-elementet
  useEffect(() => {
    cleanupOrphanedAudioElements();
    const audio = getOrCreateAudioElement();
    audioRef.current = audio;

    const container = audioContainerRef.current;
    if (container && !container.contains(audio)) {
      // vi gömmer den – behöver bara finnas i DOM
      container.appendChild(audio);
      audio.style.display = "none";
    }

    feedback.attachAudioElement(audio);
    setIsPlaying(!audio.paused);

    const handleEnded = () => {
      setIsPlaying(false);
      onSongEnd?.();
    };
    audio.addEventListener("ended", handleEnded);

    return () => {
      feedback.attachAudioElement(null);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [feedback, onSongEnd]);

  // Imperativt API till VersusOnline (startSong/pauseSong)
  useImperativeHandle(ref, () => ({
    startSong: async () => {
      const audio = audioRef.current;
      if (!audio) return;
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.error("Kunde inte starta låten", err);
      }
    },
    pauseSong: () => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.pause();
      setIsPlaying(false);
    },
  }));

  // Ladda låt när songName ändras
  useEffect(() => {
    const song =
      (songName && SONGS.find((s) => s.name === songName)) || SONGS[0];
    loadSong(song);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songName]);

  const loadSong = async (song: Song) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.src = song.audio;
    await audio.load();

    try {
      const res = await fetch(song.midi);
      if (!res.ok) throw new Error("Kunde inte hämta MIDI");
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

  // Drum hits → glow + egen scoring för versus
  useEffect(() => {
    feedback.onDrumHit((lane: LaneKey, hitTime: number) => {
      // visuell träff på pad
      setHitLanes((prev) => ({ ...prev, [lane]: Date.now() }));
      setTimeout(() => {
        setHitLanes((prev) => {
          const copy = { ...prev };
          delete copy[lane];
          return copy;
        });
      }, 200);

      const notes = notesRef.current;
      if (!notes.length) return;

      // justera för offset – vi la på latency när vi skickade till feedback
      const targetTime = hitTime - latencyRef.current / 1000;

      let bestIndex = -1;
      let bestDiff = Infinity;

      for (let i = 0; i < notes.length; i++) {
        if (judgedRef.current[i]) continue;
        const n = notes[i];
        if (n.lane !== lane) continue;
        const diff = Math.abs(n.time - targetTime);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIndex = i;
        }
      }

      if (bestIndex === -1) return;

      // trösklar i sekunder
      const PERFECT = 0.05;
      const GOOD = 0.1;
      const OK = 0.18;

      // för långt bort = miss, men markera som använd så den inte kan träffas igen
      if (bestDiff > OK) {
        judgedRef.current[bestIndex] = true;
        return;
      }

      judgedRef.current[bestIndex] = true;

      let delta = 0;
      if (bestDiff <= PERFECT) delta = 100;
      else if (bestDiff <= GOOD) delta = 70;
      else delta = 50;

      setScore((prev) => {
        const next = prev + delta;
        onScoreChangeRef.current?.(next);
        return next;
      });
    });
  }, [feedback]);

  // Notes → feedback-system (för detaljerad feedback-panelen)
  useEffect(() => {
    const offset = latencyMs / 1000;
    const adjusted = allNotes.map((n) => ({ ...n, time: n.time + offset }));
    feedback.setNotesToTrack(adjusted);
  }, [allNotes, latencyMs, feedback]);

  // Rita canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const now = audioRef.current?.currentTime ?? 0;

      const bgGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      bgGrad.addColorStop(0, "#0f172a");
      bgGrad.addColorStop(1, "#020617");
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

      for (const lane of Object.keys(hitLanes) as LaneKey[]) {
        highlight[lane] = true;
      }

      const base = applyDifficulty(allNotes, difficulty);
      const stream = base.filter((n) => laneOrder.includes(n.lane));

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

  return (
    <div className="px-2">
      {/* Gömda audio-containern – behövs för att singleton-audio ska finnas i DOM */}
      <div ref={audioContainerRef} style={{ display: "none" }} />

      <div
        className="mt-4 flex flex-wrap justify-center gap-6"
        style={{ maxWidth: "1400px", margin: "0 auto" }}
      >
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
            />
          </div>
        </div>

        <div style={{ flex: "0 0 auto", width: "100%", maxWidth: "400px" }}>
          <DrumFeedbackPanel feedback={feedback} />
        </div>
      </div>
    </div>
  );
});

export default VersusDrumVisualizer;

/* === Hjälpfunktioner === */

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

/* === Neon-blå UI (samma stil som övriga appen) === */
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
if (typeof document !== "undefined") {
  document.head.appendChild(style);
}
