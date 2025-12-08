import React, { useEffect, useRef, useState } from "react";
import "./PianoVisualizer.css";

type PianoNote = {
  id: string;
  midi: number;      // 60 = C4
  startTime: number; // sekunder
  duration: number;  // sekunder
};

type Song = {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  length: number;        // total längd i sekunder
  notes: PianoNote[];
  audioUrl?: string;     // t.ex "/piano/furelise.mid"
};

type NoteFeedbackState = "hit" | "missed";

const MIN_MIDI = 48; // C3
const MAX_MIDI = 84; // C6
const VISIBLE_WINDOW = 4;   // hur många sekunder ovanför tangenterna
const HIT_WINDOW = 0.18;    // tidsfönster för träff

// ---------- Hjälpfunktioner ----------

const isBlackKey = (midi: number): boolean => {
  const n = midi % 12;
  return [1, 3, 6, 8, 10].includes(n);
};

const noteNameFromMidi = (midi: number): string => {
  const names = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
  const octave = Math.floor(midi / 12) - 1;
  return `${names[midi % 12] ?? "?"}${octave}`;
};

const formatTime = (sec: number): string => {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return `${m}:${rest.toString().padStart(2, "0")}`;
};

// Ljud-filnamn: public/piano/C4.mp3, Cs4.mp3 osv
const getNoteAudioUrl = (midi: number): string => {
  return `/piano/${noteNameFromMidi(midi)
    .replace("♯", "s")
    .replace("#", "s")}.mp3`;
};

// ---------- Keyboard-layout (realistisk pianofördelning) ----------

type KeyLayout = {
  midi: number;
  isBlack: boolean;
  leftPercent: number;
  widthPercent: number;
};

const buildKeyLayout = (): {
  layouts: KeyLayout[];
  byMidi: Record<number, KeyLayout>;
} => {
  const whiteIndexMap: Record<number, number> = {};
  let whiteIndex = 0;

  for (let m = MIN_MIDI; m <= MAX_MIDI; m++) {
    if (!isBlackKey(m)) {
      whiteIndexMap[m] = whiteIndex;
      whiteIndex++;
    }
  }

  const whiteCount = whiteIndex;
  const layouts: KeyLayout[] = [];
  const byMidi: Record<number, KeyLayout> = {};

  for (let m = MIN_MIDI; m <= MAX_MIDI; m++) {
    const black = isBlackKey(m);
    let leftUnits = 0;
    let widthUnits = 1;

    if (!black) {
      const idx = whiteIndexMap[m];
      leftUnits = idx;
      widthUnits = 1;
    } else {
      // Svarta tangenter ligger mellan föregående och nästa vita
      let prevWhiteMidi = m - 1;
      while (prevWhiteMidi >= MIN_MIDI && isBlackKey(prevWhiteMidi)) {
        prevWhiteMidi--;
      }
      const baseIndex = whiteIndexMap[prevWhiteMidi] ?? 0;
      leftUnits = baseIndex + 0.65;
      widthUnits = 0.6;
    }

    const leftPercent = (leftUnits / whiteCount) * 100;
    const widthPercent = (widthUnits / whiteCount) * 100;
    const layout: KeyLayout = {
      midi: m,
      isBlack: black,
      leftPercent,
      widthPercent,
    };

    layouts.push(layout);
    byMidi[m] = layout;
  }

  return { layouts, byMidi };
};

const { layouts: KEY_LAYOUTS, byMidi: KEY_LAYOUT_BY_MIDI } = buildKeyLayout();

const getKeyLayout = (midi: number): KeyLayout => {
  return (
    KEY_LAYOUT_BY_MIDI[midi] ?? {
      midi,
      isBlack: isBlackKey(midi),
      leftPercent: 0,
      widthPercent: 100 / (MAX_MIDI - MIN_MIDI + 1),
    }
  );
};

// ---------- Demo-låtar (inkl. Fur Elise intro) ----------

const SONGS: Song[] = [
  {
    id: "demo1",
    title: "C-dur steg",
    artist: "D-Projekt",
    bpm: 90,
    length: 12,
    notes: [
      { id: "d1", midi: 60, startTime: 1, duration: 0.6 },
      { id: "d2", midi: 62, startTime: 1.7, duration: 0.6 },
      { id: "d3", midi: 64, startTime: 2.4, duration: 0.6 },
      { id: "d4", midi: 65, startTime: 3.1, duration: 0.6 },
      { id: "d5", midi: 67, startTime: 3.8, duration: 0.6 },
      { id: "d6", midi: 69, startTime: 4.5, duration: 0.6 },
      { id: "d7", midi: 71, startTime: 5.2, duration: 0.6 },
      { id: "d8", midi: 72, startTime: 6.0, duration: 1.2 },
    ],
  },
  {
    id: "demo2",
    title: "Arpeggio loop",
    artist: "D-Projekt",
    bpm: 110,
    length: 14,
    notes: [
      { id: "a1", midi: 60, startTime: 1.0, duration: 0.4 },
      { id: "a2", midi: 64, startTime: 1.4, duration: 0.4 },
      { id: "a3", midi: 67, startTime: 1.8, duration: 0.4 },
      { id: "a4", midi: 72, startTime: 2.2, duration: 0.7 },

      { id: "a5", midi: 62, startTime: 3.4, duration: 0.4 },
      { id: "a6", midi: 65, startTime: 3.8, duration: 0.4 },
      { id: "a7", midi: 69, startTime: 4.2, duration: 0.4 },
      { id: "a8", midi: 74, startTime: 4.6, duration: 0.7 },

      { id: "a9", midi: 64, startTime: 6.0, duration: 0.4 },
      { id: "a10", midi: 67, startTime: 6.4, duration: 0.4 },
      { id: "a11", midi: 71, startTime: 6.8, duration: 0.4 },
      { id: "a12", midi: 76, startTime: 7.2, duration: 0.8 },
    ],
  },
  {
    id: "furelise",
    title: "Für Elise (intro)",
    artist: "L. v. Beethoven",
    bpm: 120,
    length: 18,
    audioUrl: "/piano/furelise.mid",
    // förenklad intro – du kan lägga till fler noter sen
    notes: [
      { id: "fe1", midi: 76, startTime: 1.0, duration: 0.6 }, // E6
      { id: "fe2", midi: 75, startTime: 1.6, duration: 0.6 }, // D#6
      { id: "fe3", midi: 76, startTime: 2.2, duration: 0.6 },
      { id: "fe4", midi: 75, startTime: 2.8, duration: 0.6 },
      { id: "fe5", midi: 76, startTime: 3.4, duration: 0.6 },
      { id: "fe6", midi: 71, startTime: 4.0, duration: 0.7 }, // B5
      { id: "fe7", midi: 74, startTime: 4.9, duration: 0.7 }, // D6
      { id: "fe8", midi: 72, startTime: 5.8, duration: 1.0 }, // C6

      { id: "fe9", midi: 64, startTime: 7.4, duration: 0.6 }, // E5
      { id: "fe10", midi: 60, startTime: 8.0, duration: 0.6 }, // A4
      { id: "fe11", midi: 62, startTime: 8.6, duration: 0.6 }, // B4
      { id: "fe12", midi: 64, startTime: 9.2, duration: 0.6 }, // C5
      { id: "fe13", midi: 65, startTime: 9.8, duration: 0.6 }, // D5
      { id: "fe14", midi: 62, startTime: 10.4, duration: 0.8 }, // B4
      { id: "fe15", midi: 60, startTime: 11.4, duration: 0.8 }, // A4
    ],
  },
];

// ---------- Komponent ----------

const PianoVizualiser: React.FC = () => {
  const [currentSongId, setCurrentSongId] = useState<string>(SONGS[0].id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [midiStatus, setMidiStatus] = useState("Inte ansluten");
  const [activeKeys, setActiveKeys] = useState<number[]>([]);
  const [noteFeedback, setNoteFeedback] = useState<
    Record<string, NoteFeedbackState>
  >({});
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackKind, setFeedbackKind] = useState<"" | "good" | "bad">("");

  const [stats, setStats] = useState({
    hits: 0,
    total: 0,
    combo: 0,
    maxCombo: 0,
  });

  const startTsRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const playbackTimeRef = useRef(0);
  const prevPlaybackTimeRef = useRef(0);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const midiInputRef = useRef<any>(null);

  const audioCacheRef = useRef<
    Record<string, { audio: HTMLAudioElement; ok: boolean | null }>
  >({});
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);

  const currentSong = SONGS.find((s) => s.id === currentSongId)!;
  const notes = currentSong.notes;
  const length = currentSong.length;

  // Håll ref uppdaterad
  useEffect(() => {
    playbackTimeRef.current = playbackTime;
  }, [playbackTime]);

  // ---------- Ljud för enstaka toner ----------

  const playFallbackSynth = (midi: number) => {
    if (!soundEnabled) return;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const freq = 440 * Math.pow(2, (midi - 69) / 12);

    osc.frequency.value = freq;
    osc.type = "triangle";

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(now + 0.5);
  };

  const playNoteSound = (midi: number) => {
    if (!soundEnabled) return;
    const url = getNoteAudioUrl(midi);

    let cached = audioCacheRef.current[url];

    if (!cached) {
      const audio = new Audio(url);
      cached = { audio, ok: null };
      audio.addEventListener("canplaythrough", () => {
        cached.ok = true;
      });
      audio.addEventListener("error", () => {
        cached.ok = false;
      });
      audioCacheRef.current[url] = cached;
    }

    if (cached.ok === false) {
      playFallbackSynth(midi);
      return;
    }

    try {
      cached.audio.currentTime = 0;
      const playPromise = cached.audio.play();
      if (playPromise && typeof playPromise.then === "function") {
        playPromise.catch(() => playFallbackSynth(midi));
      }
    } catch {
      playFallbackSynth(midi);
    }
  };

  // Spela automatiskt när noten passerar träff-linjen
  useEffect(() => {
    if (!isPlaying) {
      prevPlaybackTimeRef.current = playbackTime;
      return;
    }

    const prev = prevPlaybackTimeRef.current;
    const curr = playbackTime;

    if (curr < prev) {
      prevPlaybackTimeRef.current = curr;
      return;
    }

    notes.forEach((note) => {
      if (note.startTime >= prev && note.startTime < curr) {
        playNoteSound(note.midi);
      }
    });

    prevPlaybackTimeRef.current = curr;
  }, [playbackTime, isPlaying, notes]);

  // ---------- Bakgrunds-audio för låtar (t.ex. furelise.mid) ----------

  useEffect(() => {
    const audio = bgAudioRef.current;
    if (!audio) return;

    if (currentSong.audioUrl) {
      audio.src = currentSong.audioUrl;
      audio.currentTime = 0;
    } else {
      audio.removeAttribute("src");
    }

    setIsPlaying(false);
    setPlaybackTime(0);
    playbackTimeRef.current = 0;
    prevPlaybackTimeRef.current = 0;
    startTsRef.current = null;
  }, [currentSongId]);

  // synka play/pause mot bg-audio
  useEffect(() => {
    const audio = bgAudioRef.current;
    if (!audio || !currentSong.audioUrl) return;

    if (isPlaying) {
      audio.currentTime = Math.min(playbackTimeRef.current, audio.duration || length);
      audio.play().catch(() => {
        /* ignore */
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, currentSong.audioUrl, length]);

  // synka seek mot bg-audio
  const syncBgAudioSeek = (time: number) => {
    const audio = bgAudioRef.current;
    if (!audio || !currentSong.audioUrl) return;
    audio.currentTime = Math.min(time, audio.duration || time);
  };

  // ---------- Playback-loop ----------

  useEffect(() => {
    if (!isPlaying) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }

    const loop = (ts: number) => {
      if (startTsRef.current === null) {
        startTsRef.current = ts - (playbackTimeRef.current / speed) * 1000;
      }
      const elapsed = (ts - startTsRef.current) / 1000;
      const newTime = elapsed * speed;

      if (newTime >= length + 1) {
        setIsPlaying(false);
        setPlaybackTime(length);
        playbackTimeRef.current = length;
        return;
      }

      setPlaybackTime(newTime);
      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isPlaying, speed, length]);

  const resetPlayback = () => {
    setIsPlaying(false);
    setPlaybackTime(0);
    playbackTimeRef.current = 0;
    prevPlaybackTimeRef.current = 0;
    startTsRef.current = null;
    setNoteFeedback({});
    setStats({ hits: 0, total: 0, combo: 0, maxCombo: 0 });
    setFeedbackKind("");
    setFeedbackMessage("");
    syncBgAudioSeek(0);
  };

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    startTsRef.current = null;
    setIsPlaying(true);
  };

  const seekTo = (time: number) => {
    const clamped = Math.max(0, Math.min(length, time));
    setPlaybackTime(clamped);
    playbackTimeRef.current = clamped;
    prevPlaybackTimeRef.current = clamped;

    if (isPlaying && startTsRef.current !== null) {
      const now =
        typeof performance !== "undefined"
          ? performance.now()
          : Date.now();
      startTsRef.current = now - (clamped / speed) * 1000;
    }

    syncBgAudioSeek(clamped);
  };

  const skipBy = (delta: number) => {
    seekTo(playbackTimeRef.current + delta);
  };

  // ---------- MIDI ----------

  const connectMidi = async () => {
    try {
      const navAny = navigator as any;
      if (!navAny.requestMIDIAccess) {
        setMidiStatus("Web MIDI stöds inte i denna webbläsare.");
        return;
      }
      const midiAccess = await navAny.requestMIDIAccess();
      const inputs = Array.from(midiAccess.inputs.values());
      if (!inputs.length) {
        setMidiStatus("Ingen MIDI-enhet hittades.");
        return;
      }
      const input = inputs[0];
      midiInputRef.current = input;
      input.onmidimessage = handleMidiMessage;
      setMidiStatus(`Ansluten till ${input.name || "MIDI-enhet"}`);
    } catch (e) {
      console.error(e);
      setMidiStatus("Kunde inte ansluta till MIDI.");
    }
  };

  const handleMidiMessage = (event: any) => {
    const [status, d1, d2] = event.data;
    const command = status & 0xf0;
    const note = d1;
    const velocity = d2;

    if (command === 0x90 && velocity > 0) {
      handleNoteOn(note);
    } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
      handleNoteOff(note);
    }
  };

  const handleNoteOn = (midi: number) => {
    if (midi < MIN_MIDI || midi > MAX_MIDI) {
      playNoteSound(midi);
      return;
    }

    setActiveKeys((prev) =>
      prev.includes(midi) ? prev : [...prev, midi]
    );
    playNoteSound(midi);

    const now = playbackTimeRef.current;

    const candidates = notes.filter(
      (n) =>
        Math.abs(n.startTime - now) <= HIT_WINDOW &&
        !noteFeedback[n.id]
    );

    if (!candidates.length) {
      registerMiss(midi, null);
      return;
    }

    const closest = candidates.reduce((best, n) =>
      Math.abs(n.startTime - now) < Math.abs(best.startTime - now)
        ? n
        : best
    );

    if (closest.midi === midi) {
      registerHit(closest, now);
    } else {
      registerMiss(midi, closest);
    }
  };

  const handleNoteOff = (midi: number) => {
    setActiveKeys((prev) => prev.filter((n) => n !== midi));
  };

  const scheduleFeedbackClear = () => {
    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFeedbackKind("");
      setFeedbackMessage("");
    }, 1600);
  };

  const registerHit = (note: PianoNote, time: number) => {
    setNoteFeedback((prev) => ({ ...prev, [note.id]: "hit" }));
    setStats((prev) => {
      const total = prev.total + 1;
      const hits = prev.hits + 1;
      const combo = prev.combo + 1;
      return {
        hits,
        total,
        combo,
        maxCombo: Math.max(prev.maxCombo, combo),
      };
    });

    const delta = time - note.startTime;
    let msg = "Perfekt! 🎯";
    if (delta > 0.06) msg = "Lite sent, men rätt ton ✅";
    if (delta < -0.06) msg = "Lite tidigt, men rätt ton ✅";

    setFeedbackKind("good");
    setFeedbackMessage(`${msg} (${noteNameFromMidi(note.midi)})`);
    scheduleFeedbackClear();
  };

  const registerMiss = (played: number, expected: PianoNote | null) => {
    setStats((prev) => ({
      hits: prev.hits,
      total: prev.total + 1,
      combo: 0,
      maxCombo: prev.maxCombo,
    }));

    if (expected && !noteFeedback[expected.id]) {
      setNoteFeedback((prev) => ({ ...prev, [expected.id]: "missed" }));
    }

    setFeedbackKind("bad");
    if (expected) {
      setFeedbackMessage(
        `Fel ton: ${noteNameFromMidi(
          played
        )}, skulle vara ${noteNameFromMidi(expected.midi)}`
      );
    } else {
      setFeedbackMessage(
        `Fel ton: ${noteNameFromMidi(
          played
        )} (ingen ton förväntades här)`
      );
    }
    scheduleFeedbackClear();
  };

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current !== null) {
        window.clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  // ---------- Grafik-hjälp ----------

  // vilka tangenter ska lysa precis när blocket "nuddar" linjen
  const autoHighlightKeys = notes
    .filter((n) => Math.abs(n.startTime - playbackTime) <= 0.04)
    .map((n) => n.midi);

  const getNoteStyle = (note: PianoNote): React.CSSProperties => {
    const tDelta = note.startTime - playbackTime;

    if (tDelta < -0.25 || tDelta > VISIBLE_WINDOW) {
      // försvinner strax efter träff, så den inte "glider under"
      return { display: "none" };
    }

    const norm = 1 - tDelta / VISIBLE_WINDOW; // 0..1 i play-area
    const top = Math.max(0, Math.min(1, norm)) * 100;

    const layout = getKeyLayout(note.midi);
    const style: React.CSSProperties = {
      top: `${top}%`,
      left: `${layout.leftPercent}%`,
      width: `${layout.widthPercent}%`,
      opacity: tDelta < 0 ? 0.5 : 1,
      zIndex: 5,
    };

    const fb = noteFeedback[note.id];
    if (fb === "hit") {
      style.boxShadow = "0 0 26px rgba(34,197,94,1)";
    } else if (fb === "missed") {
      style.boxShadow = "0 0 26px rgba(248,113,113,1)";
      style.opacity = 0.95;
    }

    return style;
  };

  const accuracy =
    stats.total > 0 ? Math.round((stats.hits / stats.total) * 100) : 0;

  const handleSongChange = (id: string) => {
    setCurrentSongId(id);
    resetPlayback();
  };

  // ---------- UI ----------

  return (
    <div className="pv-root">
      {/* dold audio för t.ex. furelise.mid */}
      <audio ref={bgAudioRef} />

      <div className="pv-top-bar">
        <div className="pv-logo-block">
          <div className="pv-logo-cube">A-23</div>
          <div className="pv-logo-text">Virtual Piano</div>
        </div>
        <div className="pv-display">
          {isPlaying
            ? "PLAY"
            : playbackTime > 0 && playbackTime < length
            ? "PAUSE"
            : "READY"}
        </div>
        <div className="pv-top-buttons">
          <button
            className={`pv-small-toggle ${soundEnabled ? "on" : "off"}`}
            onClick={() => setSoundEnabled((v) => !v)}
          >
            {soundEnabled ? "Ljud: På" : "Ljud: Av"}
          </button>
          <button className="pv-small-toggle" onClick={connectMidi}>
            MIDI
          </button>
        </div>
      </div>

      <div className="pv-songbar">
        <div className="pv-song-select">
          <label>
            Låt:
            <select
              value={currentSongId}
              onChange={(e) => handleSongChange(e.target.value)}
            >
              {SONGS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} – {s.artist}
                </option>
              ))}
            </select>
          </label>
          <span className="pv-song-meta">{currentSong.bpm} BPM</span>
        </div>

        <div className="pv-transport">
          <button className="pv-ctrl-btn" onClick={() => skipBy(-2)}>
            ⏪
          </button>
          <button className="pv-ctrl-btn" onClick={togglePlay}>
            {isPlaying ? "⏸" : "▶"}
          </button>
          <button className="pv-ctrl-btn" onClick={() => skipBy(2)}>
            ⏩
          </button>
          <button className="pv-ctrl-btn" onClick={resetPlayback}>
            ⏮
          </button>
        </div>

        <div className="pv-progress">
          <span className="pv-time">{formatTime(playbackTime)}</span>
          <input
            type="range"
            min={0}
            max={length}
            step={0.01}
            value={Math.min(playbackTime, length)}
            onChange={(e) => seekTo(Number(e.target.value))}
          />
          <span className="pv-time">{formatTime(length)}</span>
        </div>
      </div>

      <div className="pv-layout">
        <div className="pv-note-area">
          {/* PLAY-AREA: bara här åker blocken, ovanför tangenterna */}
          <div className="pv-play-area">
            {notes.map((note) => (
              <div
                key={note.id}
                className={
                  "pv-note " +
                  (noteFeedback[note.id] === "hit"
                    ? "pv-note-hit"
                    : noteFeedback[note.id] === "missed"
                    ? "pv-note-miss"
                    : "")
                }
                style={getNoteStyle(note)}
              />
            ))}
            <div className="pv-hit-line" />
          </div>

          {/* Tangentbordet ligger under play-area */}
          <div className="pv-keyboard-body">
            <div className="pv-keyboard">
              {/* Vita tangenter */}
              {KEY_LAYOUTS.filter((k) => !k.isBlack).map((k) => {
                const isPressed = activeKeys.includes(k.midi);
                const isAuto = autoHighlightKeys.includes(k.midi);
                let cls = "pv-key pv-key-white";
                if (isAuto) cls += " pv-key-auto";
                if (isPressed) cls += " pv-key-active";

                return (
                  <div
                    key={k.midi}
                    className={cls}
                    style={{
                      left: `${k.leftPercent}%`,
                      width: `${k.widthPercent}%`,
                    }}
                    data-note={noteNameFromMidi(k.midi)}
                  />
                );
              })}

              {/* Svarta tangenter ovanpå vita */}
              {KEY_LAYOUTS.filter((k) => k.isBlack).map((k) => {
                const isPressed = activeKeys.includes(k.midi);
                const isAuto = autoHighlightKeys.includes(k.midi);
                let cls = "pv-key pv-key-black";
                if (isAuto) cls += " pv-key-auto";
                if (isPressed) cls += " pv-key-active";

                return (
                  <div
                    key={k.midi}
                    className={cls}
                    style={{
                      left: `${k.leftPercent}%`,
                      width: `${k.widthPercent}%`,
                    }}
                    data-note={noteNameFromMidi(k.midi)}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <aside className="pv-sidebar">
          <div className="pv-panel">
            <h3>Spelstatus</h3>
            <div className="pv-row">
              <span>Tid</span>
              <span>{formatTime(playbackTime)}</span>
            </div>
            <div className="pv-row">
              <span>Träffar</span>
              <span>{stats.hits}</span>
            </div>
            <div className="pv-row">
              <span>Försök</span>
              <span>{stats.total}</span>
            </div>
            <div className="pv-row">
              <span>Träffsäkerhet</span>
              <span>{accuracy}%</span>
            </div>
            <div className="pv-row">
              <span>Combo</span>
              <span>{stats.combo}</span>
            </div>
            <div className="pv-row">
              <span>Max combo</span>
              <span>{stats.maxCombo}</span>
            </div>
          </div>

          <div className="pv-panel">
            <h3>MIDI-keyboard</h3>
            <p className="pv-midi-status">{midiStatus}</p>
            <p className="pv-hint">
              Lägg pianoljud i <code>public/piano</code> som{" "}
              <code>C4.mp3</code>, <code>Cs4.mp3</code> osv.  
              Då spelas dina riktiga samples när blocken träffar tangenterna.
            </p>
            <p className="pv-hint">
              Din fil <code>furelise.mid</code> används som bakgrunds-ljud
              för låten “Für Elise (intro)” i menyn.
            </p>
          </div>

          {feedbackMessage && (
            <div
              className={
                "pv-feedback " +
                (feedbackKind === "good"
                  ? "pv-feedback-good"
                  : feedbackKind === "bad"
                  ? "pv-feedback-bad"
                  : "")
              }
            >
              {feedbackMessage}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default PianoVizualiser;
