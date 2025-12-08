import React, { useEffect, useRef, useState } from "react";
import { Midi } from "@tonejs/midi";
import { useDrumFeedback, DrumFeedbackPanel } from "../components/DrumFeedbackSystem";
import "./VersusOnline.css";
import type { Socket } from "socket.io-client"; // 🔹 endast typ
import { socket } from "../socket";             // 🔥 delad socket


// ====== Typer & konstanter ======

type LaneKey =
  | "kick"
  | "snare"
  | "hihat"
  | "tom1"
  | "tom2"
  | "floor"
  | "crash"
  | "ride";

interface BattleNote {
  id: number;
  time: number; // sekunder från MIDI
  lane: LaneKey;
  playerHit?: boolean;
  opponentHit?: boolean;
}

interface Song {
  name: string;
  audio: string;
  midi: string;
  defaultOffset: number; // ms
  genre?: "Rock" | "Pop" | "Metal" | "HipHop" | "Electronic";
}

type Difficulty = "Nybörjare" | "Medium" | "Full";
type GameMode = "bot" | "online";
type MatchPhase =
  | "midiRequired"
  | "modeSelect"
  | "searchingOpponent"
  | "spinningSong"
  | "countdown"
  | "playing"
  | "finished";

type BotDifficulty = "easy" | "normal" | "hard";

const SONGS: Song[] = [
  {
    name: "Crazy Train - Ozzy Osbourne",
    audio: "/crazy_train.mp3",
    midi: "/crazy_train.mid",
    defaultOffset: 3000,
    genre: "Rock",
  },
  {
    name: "Back in Black - AC/DC",
    audio: "/back_in_black.mp3",
    midi: "/back_in_black.mid",
    defaultOffset: 600,
    genre: "Rock",
  },
  {
    name: "electric",
    audio: "/electric.mp3",
    midi: "/electric.mid",
    defaultOffset: 1000,
    genre: "Rock",
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

// Canvas-konstanter
const WIDTH = 900;
const HEIGHT = 420;
const TOP_Y = 100;
const HIT_Y = HEIGHT - 105;
const NOTE_SPEED = 240;
const TOP_SCALE = 0.55;

// ====== Singleton-audio ======

declare global {
  interface Window {
    __battleAudio?: HTMLAudioElement;
  }
}

function getOrCreateAudioElement(): HTMLAudioElement {
  if (typeof window === "undefined") return {} as HTMLAudioElement;
  if (window.__battleAudio) return window.__battleAudio;

  const audio = document.createElement("audio");
  audio.id = "battle-audio";
  audio.controls = false;
  audio.preload = "auto";
  window.__battleAudio = audio;
  return audio;
}

function cleanupOrphanedAudioElements() {
  if (typeof document === "undefined") return;
  const orphans = document.querySelectorAll("audio:not(#battle-audio)");
  orphans.forEach((el) => {
    const a = el as HTMLAudioElement;
    if (!a.paused) a.pause();
  });
}

// ====== Canvas-hjälpfunktioner ======

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

function drawDrumPads(
  ctx: CanvasRenderingContext2D,
  bottomX: Record<LaneKey, number>,
  hitY: number,
  highlight: Partial<Record<LaneKey, boolean>>,
  order: LaneKey[]
) {
  const glow = (lane: LaneKey) => {
    ctx.shadowBlur = highlight[lane] ? 26 : 8;
    ctx.shadowColor = highlight[lane] ? laneColor(lane) : "#000000";
  };

  order.forEach((lane) => {
    glow(lane);
    const fillDark = "#1e293b";
    const stroke = highlight[lane] ? "#60a5fa" : "#334155";
    if (lane === "hihat" || lane === "crash" || lane === "ride")
      filledEllipse(ctx, bottomX[lane], hitY, 32, 10, fillDark, stroke);
    else filledCircle(ctx, bottomX[lane], hitY, 22, fillDark, stroke);
    ctx.shadowBlur = 0;
  });
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

function applyDifficulty(src: BattleNote[], level: Difficulty): BattleNote[] {
  if (level === "Full") return src;
  const out: BattleNote[] = [];
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

// ====== Komponent ======

export default function VersusOnline() {
  const feedback = useDrumFeedback();

  // använder den delade socketen, men med ref för att kunna kolla .current i callbacks
  const socketRef = useRef<Socket | null>(socket);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  if (typeof window !== "undefined" && !audioRef.current) {
    audioRef.current = getOrCreateAudioElement();
  }

  const [allNotes, setAllNotes] = useState<BattleNote[]>([]);
  const notesRef = useRef<BattleNote[]>([]);

  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [latencyMs, setLatencyMs] = useState(0);
  const latencyRef = useRef(0);

  const [phase, setPhase] = useState<MatchPhase>("midiRequired");
  const phaseRef = useRef<MatchPhase>("midiRequired");

  const [mode, setMode] = useState<GameMode | null>(null);
  const modeRef = useRef<GameMode | null>(null);

  const [roomId, setRoomId] = useState<string | null>(null);
  const roomIdRef = useRef<string | null>(null);

  const [playerIndex, setPlayerIndex] = useState<1 | 2 | null>(null);
  const playerIndexRef = useRef<1 | 2 | null>(null);

  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>("normal");
  const [difficulty] = useState<Difficulty>("Full");
  const [hideKick] = useState(false);

  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [resultText, setResultText] = useState<string | null>(null);

  const [spinningTitle, setSpinningTitle] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(3);

  const [isMidiConnected, setIsMidiConnected] = useState(false);
  const [midiError, setMidiError] = useState<string | null>(null);
  const [onlineError, setOnlineError] = useState<string | null>(null);

  const [showFeedback, setShowFeedback] = useState(true);
  const [hitLanes, setHitLanes] = useState<Partial<Record<LaneKey, number>>>({});

  const rafId = useRef<number | undefined>(undefined);

  const slots = padSlots(WIDTH);
  const laneOrder: LaneKey[] = LANES.map((l) => l.key);
  const bottomX = bottomXFromOrder(slots, laneOrder);
  const topX = Object.fromEntries(
    laneOrder.map((k) => {
      const bx = bottomX[k];
      const cx = WIDTH / 2;
      const tx = cx + (bx - cx) * TOP_SCALE;
      return [k, tx];
    })
  ) as Record<LaneKey, number>;

  const opponentName =
    mode === "bot"
      ? "DrumBot"
      : mode === "online"
      ? "RhythmRival"
      : "Motståndare";

  // ====== synka refs ======

  useEffect(() => {
    latencyRef.current = latencyMs;
  }, [latencyMs]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    playerIndexRef.current = playerIndex;
  }, [playerIndex]);

  // ====== socket.io – riktig "sök spelare" ======

  useEffect(() => {
    // Använd den DELADE socket-instansen från src/socket.ts
    socketRef.current = socket;

    const handleConnect = () => {
      console.log("[Versus] Socket connected", socket.id);
    };

    const handleMatchFound = (data: {
      roomId: string;
      playerIndex: 1 | 2;
      songIndex: number;
    }) => {
      console.log("[Versus] matchFound", data);
      setOnlineError(null);
      setRoomId(data.roomId);
      setPlayerIndex(data.playerIndex);
      setMode("online");

      const chosen = SONGS[data.songIndex] || SONGS[0];
      startNewMatchWithSong(chosen);
    };

    const handleScoreUpdate = (data: {
      roomId: string;
      playerIndex: 1 | 2;
      score: number;
    }) => {
      if (!roomIdRef.current || data.roomId !== roomIdRef.current) return;
      if (!playerIndexRef.current) return;
      if (data.playerIndex !== playerIndexRef.current) {
        setOpponentScore(data.score);
      }
    };

    const handleQueueError = (msg: string) => {
      console.warn("[Versus] queueError", msg);
      setOnlineError(msg);
      setPhase("modeSelect");
    };

    socket.on("connect", handleConnect);
    socket.on("matchFound", handleMatchFound);
    socket.on("scoreUpdate", handleScoreUpdate);
    socket.on("queueError", handleQueueError);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("matchFound", handleMatchFound);
      socket.off("scoreUpdate", handleScoreUpdate);
      socket.off("queueError", handleQueueError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // ====== MIDI-kontroll ======

  const checkMidiConnection = async () => {
    setMidiError(null);
    if (typeof navigator === "undefined" || !(navigator as any).requestMIDIAccess) {
      setMidiError("Din webbläsare stödjer inte WebMIDI. Testa Chrome/Edge på dator.");
      return;
    }

    try {
      const access = await (navigator as any).requestMIDIAccess();
      const hasInputs = access.inputs && access.inputs.size > 0;
      if (!hasInputs) {
        setMidiError("Inget MIDI-trumset hittades. Koppla in via USB/MIDI och försök igen.");
        setIsMidiConnected(false);
        return;
      }
      setIsMidiConnected(true);
      setPhase("modeSelect");

      access.onstatechange = () => {
        const stillHas = access.inputs && access.inputs.size > 0;
        setIsMidiConnected(stillHas);
        if (!stillHas) {
          setPhase("midiRequired");
        }
      };
    } catch (e) {
      console.error(e);
      setMidiError("Kunde inte komma åt MIDI-enheter. Kontrollera webbläsarens rättigheter.");
    }
  };

  // ====== ladda låt ======

  const loadSong = async (song: Song) => {
    setSelectedSong(song);
    setLatencyMs(song.defaultOffset);

    const audio = audioRef.current;
    if (audio) {
      audio.src = song.audio;
      await audio.load();
      audio.currentTime = 0;
    }

    try {
      const res = await fetch(song.midi);
      if (!res.ok) throw new Error(`Kunde inte hämta MIDI: ${song.midi}`);
      const buf = await res.arrayBuffer();
      const midi = new Midi(buf);
      const parsed: BattleNote[] = [];
      let idCounter = 0;

      midi.tracks.forEach((tr) =>
        tr.notes.forEach((nt) => {
          if (GM_TO_LANE[nt.midi]) {
            const bpm = midi.header.tempos?.[0]?.bpm || 120;
            const t =
              nt.time && nt.time > 0
                ? nt.time
                : (nt.ticks / midi.header.ppq) * (60 / bpm);
            parsed.push({
              id: idCounter++,
              time: t,
              lane: GM_TO_LANE[nt.midi],
            });
          }
        })
      );

      parsed.sort((a, b) => a.time - b.time);
      setAllNotes(parsed);
      notesRef.current = parsed;
    } catch (err) {
      console.error(err);
      setAllNotes([]);
      notesRef.current = [];
    }
  };

  // ====== koppla till feedback-systemet ======

  useEffect(() => {
    const offsetSec = latencyMs / 1000;
    const adjusted = allNotes.map((n) => ({
      lane: n.lane,
      time: n.time + offsetSec,
    }));
    feedback.setNotesToTrack(adjusted);
  }, [allNotes, latencyMs, feedback]);

  // ====== montera audio & end-event ======

  useEffect(() => {
    cleanupOrphanedAudioElements();
    const audio = audioRef.current;
    const container = audioContainerRef.current;
    if (!audio || !container) return;

    if (!container.contains(audio)) {
      audio.controls = false;
      audio.className = "versus-audio-element";
      container.appendChild(audio);
    }

    feedback.attachAudioElement(audio);

    const onEnded = () => {
      if (phaseRef.current === "playing") {
        finishMatch();
      }
    };
    audio.addEventListener("ended", onEnded);

    return () => {
      feedback.attachAudioElement(null);
      audio.removeEventListener("ended", onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ====== dina trumslag => poäng + skicka till server vid online ======

  const handlePlayerHit = (lane: LaneKey, hitTimeSeconds: number) => {
    if (phaseRef.current !== "playing") return;

    const notes = notesRef.current;
    const windowSec = 0.18;
    const offsetSec = latencyRef.current / 1000;

    let bestIndex = -1;
    let bestDelta = windowSec;

    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      if (n.lane !== lane || n.playerHit) continue;
      const target = n.time + offsetSec;
      const delta = Math.abs(target - hitTimeSeconds);
      if (delta <= bestDelta) {
        bestDelta = delta;
        bestIndex = i;
      }
    }

    if (bestIndex !== -1) {
      notes[bestIndex].playerHit = true;
      setPlayerScore((prev) => {
        const newScore = prev + 1;

        if (
          modeRef.current === "online" &&
          roomIdRef.current &&
          playerIndexRef.current &&
          socketRef.current
        ) {
          socketRef.current.emit("scoreUpdate", {
            roomId: roomIdRef.current,
            playerIndex: playerIndexRef.current,
            score: newScore,
          });
        }

        return newScore;
      });
    }
  };

  useEffect(() => {
    feedback.onDrumHit((lane: LaneKey, hitTime: number) => {
      setHitLanes((prev) => ({ ...prev, [lane]: Date.now() }));
      setTimeout(() => {
        setHitLanes((prev) => {
          const copy = { ...prev };
          delete copy[lane];
          return copy;
        });
      }, 200);

      handlePlayerHit(lane, hitTime);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback]);

  // ====== bot-AI (endast i bot-läge) ======

  useEffect(() => {
    if (phase !== "playing" || mode !== "bot") return;

    const accuracy =
      botDifficulty === "easy" ? 0.7 : botDifficulty === "hard" ? 0.95 : 0.85;

    const interval = setInterval(() => {
      const audio = audioRef.current;
      if (!audio) return;
      const t = audio.currentTime;
      const offsetSec = latencyRef.current / 1000;
      const notes = notesRef.current;
      const windowSec = 0.06;

      for (const n of notes) {
        if (n.opponentHit) continue;
        const target = n.time + offsetSec;
        if (Math.abs(target - t) <= windowSec) {
          n.opponentHit = true;
          if (Math.random() < accuracy) {
            setOpponentScore((p) => p + 1);
          }
        }
      }
    }, 30);

    return () => clearInterval(interval);
  }, [phase, botDifficulty, mode]);

  // ====== canvas-ritning ======

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d")!;
    const draw = () => {
      const now = audioRef.current?.currentTime ?? 0;

      const bgGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      bgGrad.addColorStop(0, "#020617");
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
      const stream = (hideKick ? base.filter((n) => n.lane !== "kick") : base).filter(
        (n) => laneOrder.includes(n.lane)
      );

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

      drawDrumPads(ctx, bottomX, HIT_Y, highlight, laneOrder);
      rafId.current = requestAnimationFrame(draw);
    };

    rafId.current = requestAnimationFrame(draw);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [allNotes, latencyMs, laneOrder, hideKick, hitLanes, difficulty, bottomX, topX]);


  // ====== match-flow ======

  const resetForNewMatch = () => {
    setPlayerScore(0);
    setOpponentScore(0);
    setResultText(null);
    setCountdown(3);
    setSpinningTitle(null);
    notesRef.current = [];
    setAllNotes([]);
  };

  const startMatchCountdown = () => {
    setPhase("countdown");
    setCountdown(3);
    let v = 3;
    const timer = setInterval(() => {
      v -= 1;
      if (v <= 0) {
        clearInterval(timer);
        setCountdown(0);
        startPlaying();
      } else {
        setCountdown(v);
      }
    }, 1000);
  };

  const startPlaying = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.currentTime = 0;
      await audio.play();
      setPhase("playing");
    } catch (e) {
      console.error("Kunde inte starta uppspelning:", e);
    }
  };

  const finishMatch = () => {
    setPhase("finished");
    if (playerScore > opponentScore) {
      setResultText("Du vann! Grymt jobbat 🥁");
    } else if (playerScore < opponentScore) {
      setResultText("Du förlorade den här gången – testa igen!");
    } else {
      setResultText("Oavgjort! Riktigt jämnt 🔥");
    }
  };

  const startSongRoulette = (forcedSong?: Song) => {
    setPhase("spinningSong");
    setSpinningTitle("Snurrar igenom låtar...");
    let index = 0;

    const spinInterval = setInterval(() => {
      const s = SONGS[index % SONGS.length];
      setSpinningTitle(`${s.genre ?? "Låt"} · ${s.name}`);
      index++;
    }, 120);

    setTimeout(async () => {
      clearInterval(spinInterval);
      const finalSong =
        forcedSong ?? SONGS[Math.floor(Math.random() * SONGS.length)];
      await loadSong(finalSong);
      setSpinningTitle(`${finalSong.genre ?? "Låt"} · ${finalSong.name}`);
      startMatchCountdown();
    }, 2600);
  };

  const startNewMatchWithSong = (song: Song) => {
    resetForNewMatch();
    startSongRoulette(song);
  };

  const handleSelectBot = () => {
    resetForNewMatch();
    setMode("bot");
    startSongRoulette();
  };

  const handleSelectOnline = () => {
    if (!socketRef.current) {
      setOnlineError("Ingen socket-anslutning – kolla servern.");
      return;
    }
    resetForNewMatch();
    setMode("online");
    setPhase("searchingOpponent");
    setOnlineError(null);
    socketRef.current.emit("joinBattleQueue");
  };

  const handlePlayAgain = () => {
    resetForNewMatch();
    if (isMidiConnected) {
      setPhase("modeSelect");
    } else {
      setPhase("midiRequired");
    }
  };

  // ====== UI state ======

  const totalScore = Math.max(1, playerScore + opponentScore);
  const playerPct = (playerScore / totalScore) * 100;

  const friendlyStatus =
    phase === "midiRequired"
      ? "Väntar på MIDI-trumset"
      : phase === "modeSelect"
      ? "Välj spelläge"
      : phase === "searchingOpponent"
      ? "Söker motståndare..."
      : phase === "spinningSong"
      ? "Väljer låt..."
      : phase === "countdown"
      ? "Nedräkning"
      : phase === "playing"
      ? "Match pågår"
      : "Match avslutad";

  return (
    <div className="versus-page">
      <header className="versus-header">
        <div>
          <h1 className="versus-title">Online Battle</h1>
          <p className="versus-subtitle">
            Genre: {selectedSong?.genre ?? "–"} · Låt:{" "}
            {selectedSong?.name ?? "väntar på val..."}
          </p>
        </div>
        <div className="versus-header-right">
          <div
            className={
              "versus-midi-pill " + (isMidiConnected ? "connected" : "disconnected")
            }
          >
            {isMidiConnected ? "MIDI-läge aktivt ✅" : "MIDI ej ansluten"}
          </div>
          <button
            className="versus-small-btn"
            onClick={() => setShowFeedback((v) => !v)}
          >
            {showFeedback ? "Dölj feedback" : "Visa feedback"}
          </button>
        </div>
      </header>

      <section className="versus-scorebar">
        <div className="versus-score-label-row">
          <span className="versus-score-label">Du – {playerScore} poäng</span>
          <span className="versus-status-pill">{friendlyStatus}</span>
          <span className="versus-score-label right">
            {opponentName} – {opponentScore} poäng
          </span>
        </div>
        <div
          className="versus-score-track"
          style={{
            background: `linear-gradient(90deg,#3b82f6 ${playerPct}%,#fb923c ${playerPct}%)`,
          }}
        />
      </section>

      <main className="versus-main">
        {/* ljudet är gömt men aktivt */}
        <div ref={audioContainerRef} className="versus-audio-shell-hidden" />

        <div className="versus-canvas-wrap">
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

        {showFeedback && (
          <div className="versus-feedback-wrap">
            <DrumFeedbackPanel feedback={feedback} />
          </div>
        )}
      </main>

      <section className="versus-footer-help">
        <h2>Hur funkar matchen?</h2>
        <p>
          Följ noterna som faller. När de träffar den vita linjen ska du slå på
          rätt trumdel. Endast träffar nära linjen ger poäng – både för dig och{" "}
          {opponentName}.
        </p>
        <p>
          Du behöver inte starta/pausa själv – spelet sköter starter, nedräkning
          och låtval. Välj bara läge och spela.
        </p>
      </section>

      {(phase === "midiRequired" ||
        phase === "modeSelect" ||
        phase === "searchingOpponent" ||
        phase === "spinningSong" ||
        phase === "countdown" ||
        phase === "finished") && (
        <div className="versus-overlay">
          <div className="versus-modal">
            {phase === "midiRequired" && (
              <>
                <h2 className="versus-modal-title">Anslut ditt e-trumset</h2>
                <p className="versus-modal-text">
                  För att spela Online Battle behöver du koppla in ditt
                  USB/MIDI-trumset. När vi hittar det kan du välja spelläge.
                </p>
                {midiError && <p className="versus-modal-error">{midiError}</p>}
                <button
                  className="versus-mode-btn primary"
                  onClick={checkMidiConnection}
                >
                  🔌 Sök efter trumset
                </button>
                <p className="versus-modal-sub">
                  Tips: slå försiktigt på en pad efter att du kopplat in – då ser
                  du snabbt om allt funkar.
                </p>
              </>
            )}

            {phase === "modeSelect" && (
              <>
                <h2 className="versus-modal-title">Välj spelläge</h2>
                <p className="versus-modal-text">
                  Bestäm om du vill utmana en smart bot eller en riktig spelare
                  online.
                </p>

                <div className="versus-bot-diff-row">
                  <label>Botens svårighetsgrad:</label>
                  <select
                    value={botDifficulty}
                    onChange={(e) =>
                      setBotDifficulty(e.target.value as BotDifficulty)
                    }
                  >
                    <option value="easy">Lätt</option>
                    <option value="normal">Medel</option>
                    <option value="hard">Svår</option>
                  </select>
                </div>

                <div className="versus-mode-buttons">
                  <button
                    className="versus-mode-btn primary"
                    onClick={handleSelectBot}
                  >
                    🤖 Spela mot bot
                    <span>Boten får poäng när den träffar noterna – precis som du.</span>
                  </button>
                  <button
                    className="versus-mode-btn secondary"
                    onClick={handleSelectOnline}
                  >
                    🌐 Sök spelare
                    <span>
                      Går in i kö och parar ihop dig med en annan spelare.
                    </span>
                  </button>
                </div>
                {onlineError && (
                  <p className="versus-modal-error">{onlineError}</p>
                )}
              </>
            )}

            {phase === "searchingOpponent" && (
              <>
                <h2 className="versus-modal-title">Söker motståndare...</h2>
                <div className="versus-spinner" />
                <p className="versus-modal-text">
                  Vi letar efter en RhythmRival. Ha trumstockarna redo. Öppna
                  samma sida i en annan webbläsare för att testa med dig själv.
                </p>
              </>
            )}

            {phase === "spinningSong" && (
              <>
                <h2 className="versus-modal-title">Väljer låt...</h2>
                <div className="versus-spinner" />
                <p className="versus-modal-text">
                  {spinningTitle ?? "Snurrar igenom spellistan..."}
                </p>
              </>
            )}

            {phase === "countdown" && (
              <>
                <h2 className="versus-modal-title">Redo?</h2>
                <div className="versus-countdown">{countdown}</div>
                <p className="versus-modal-text">
                  Slå när noterna träffar den vita linjen. Matchen startar nu!
                </p>
              </>
            )}

            {phase === "finished" && (
              <>
                <h2 className="versus-modal-title">
                  {resultText ?? "Match klar"}
                </h2>
                <p className="versus-modal-text">
                  Du: {playerScore} poäng · {opponentName}: {opponentScore} poäng
                </p>
                <div className="versus-mode-buttons">
                  <button
                    className="versus-mode-btn primary"
                    onClick={handlePlayAgain}
                  >
                    🔁 Spela igen
                  </button>
                  <button
                    className="versus-mode-btn ghost"
                    onClick={() => {
                      resetForNewMatch();
                      if (isMidiConnected) setPhase("modeSelect");
                      else setPhase("midiRequired");
                    }}
                  >
                    Byt spelläge
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
