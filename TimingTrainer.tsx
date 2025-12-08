import React, { useEffect, useRef, useState, useCallback } from "react";
import "./TimingTrainer.css";

const MIN_BPM = 20;
const MAX_BPM = 300;

type TimeSignature = { upper: number; lower: number };
type Subdivision = 1 | 2 | 3 | 4 | 6;
type SwingAmount = 0 | 15 | 33 | 50 | 67;
type SoundType = "click" | "wood" | "electronic" | "drum" | "cowbell" | "hihat";
type TrainingMode = "normal" | "speed" | "precision" | "random" | "silent";
type VisualMode = "full" | "minimal" | "pulse" | "flash";

interface DrumPreset {
  name: string;
  bpm: number;
  timeSignature: TimeSignature;
  subdivision: Subdivision;
  swing: SwingAmount;
  icon: string;
}

interface AccentPreset {
  name: string;
  pattern: boolean[];
  description: string;
}

interface SavedSession {
  name: string;
  bpm: number;
  timeSignature: TimeSignature;
  subdivision: Subdivision;
  swing: SwingAmount;
  accentPattern: boolean[];
}

const DRUM_PRESETS: DrumPreset[] = [
  { name: "Ballad", bpm: 60, timeSignature: { upper: 4, lower: 4 }, subdivision: 1, swing: 0, icon: "🎵" },
  { name: "Hip-Hop", bpm: 90, timeSignature: { upper: 4, lower: 4 }, subdivision: 2, swing: 15, icon: "🎤" },
  { name: "Pop", bpm: 120, timeSignature: { upper: 4, lower: 4 }, subdivision: 1, swing: 0, icon: "🎸" },
  { name: "Rock", bpm: 130, timeSignature: { upper: 4, lower: 4 }, subdivision: 2, swing: 0, icon: "🤘" },
  { name: "Punk", bpm: 180, timeSignature: { upper: 4, lower: 4 }, subdivision: 1, swing: 0, icon: "⚡" },
  { name: "Metal", bpm: 200, timeSignature: { upper: 4, lower: 4 }, subdivision: 2, swing: 0, icon: "🔥" },
  { name: "Funk", bpm: 100, timeSignature: { upper: 4, lower: 4 }, subdivision: 4, swing: 15, icon: "🕺" },
  { name: "Jazz", bpm: 140, timeSignature: { upper: 4, lower: 4 }, subdivision: 3, swing: 67, icon: "🎷" },
  { name: "Swing", bpm: 160, timeSignature: { upper: 4, lower: 4 }, subdivision: 2, swing: 67, icon: "🎺" },
  { name: "Reggae", bpm: 75, timeSignature: { upper: 4, lower: 4 }, subdivision: 2, swing: 33, icon: "🌴" },
  { name: "Bossa", bpm: 130, timeSignature: { upper: 4, lower: 4 }, subdivision: 2, swing: 15, icon: "🌊" },
  { name: "Samba", bpm: 100, timeSignature: { upper: 2, lower: 4 }, subdivision: 4, swing: 0, icon: "💃" },
  { name: "Waltz", bpm: 100, timeSignature: { upper: 3, lower: 4 }, subdivision: 1, swing: 0, icon: "👗" },
  { name: "6/8 Feel", bpm: 80, timeSignature: { upper: 6, lower: 8 }, subdivision: 1, swing: 0, icon: "🌙" },
  { name: "Shuffle", bpm: 120, timeSignature: { upper: 4, lower: 4 }, subdivision: 3, swing: 67, icon: "🔀" },
  { name: "Double-time", bpm: 140, timeSignature: { upper: 4, lower: 4 }, subdivision: 4, swing: 0, icon: "⏩" },
  { name: "Half-time", bpm: 70, timeSignature: { upper: 4, lower: 4 }, subdivision: 1, swing: 0, icon: "⏪" },
  { name: "Blast Beat", bpm: 220, timeSignature: { upper: 4, lower: 4 }, subdivision: 4, swing: 0, icon: "💀" },
  { name: "5/4 Prog", bpm: 120, timeSignature: { upper: 5, lower: 4 }, subdivision: 1, swing: 0, icon: "🎹" },
  { name: "7/8 Odd", bpm: 140, timeSignature: { upper: 7, lower: 8 }, subdivision: 1, swing: 0, icon: "🔢" },
];

const ACCENT_PRESETS: AccentPreset[] = [
  { name: "Standard", pattern: [true, false, false, false], description: "Accent på 1:an" },
  { name: "Backbeat", pattern: [false, true, false, true], description: "Accent på 2 & 4" },
  { name: "Alla", pattern: [true, true, true, true], description: "Accent på alla slag" },
  { name: "1 & 3", pattern: [true, false, true, false], description: "Accent på 1 & 3" },
  { name: "Offbeat", pattern: [false, true, false, false], description: "Endast 2:an" },
];

const TIME_SIGNATURES: TimeSignature[] = [
  { upper: 2, lower: 4 }, { upper: 3, lower: 4 }, { upper: 4, lower: 4 },
  { upper: 5, lower: 4 }, { upper: 6, lower: 4 }, { upper: 7, lower: 4 },
  { upper: 3, lower: 8 }, { upper: 5, lower: 8 }, { upper: 6, lower: 8 },
  { upper: 7, lower: 8 }, { upper: 9, lower: 8 }, { upper: 11, lower: 8 },
  { upper: 12, lower: 8 }, { upper: 15, lower: 8 },
];

const SOUND_TYPES: { type: SoundType; name: string; icon: string }[] = [
  { type: "click", name: "Klassisk", icon: "🔔" },
  { type: "wood", name: "Trä", icon: "🪵" },
  { type: "electronic", name: "Elektronisk", icon: "⚡" },
  { type: "drum", name: "Trumma", icon: "🥁" },
  { type: "cowbell", name: "Koskälla", icon: "🔔" },
  { type: "hihat", name: "Hi-Hat", icon: "🎵" },
];

function getTempoName(bpm: number): string {
  if (bpm < 40) return "Grave";
  if (bpm < 60) return "Largo";
  if (bpm < 76) return "Adagio";
  if (bpm < 108) return "Andante";
  if (bpm < 120) return "Moderato";
  if (bpm < 140) return "Allegro";
  if (bpm < 168) return "Vivace";
  if (bpm < 200) return "Presto";
  return "Prestissimo";
}

function getTempoColor(bpm: number): string {
  if (bpm < 60) return "#60a5fa";
  if (bpm < 100) return "#34d399";
  if (bpm < 140) return "#fbbf24";
  if (bpm < 180) return "#f97316";
  return "#ef4444";
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function TimingTrainer() {
  const [bpm, setBpm] = useState<number>(100);
  const [targetBpm, setTargetBpm] = useState<number>(100);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [timeSignature, setTimeSignature] = useState<TimeSignature>({ upper: 4, lower: 4 });
  const [subdivision, setSubdivision] = useState<Subdivision>(1);
  const [swing, setSwing] = useState<SwingAmount>(0);
  const [currentBeat, setCurrentBeat] = useState<number>(0);
  const [currentSubBeat, setCurrentSubBeat] = useState<number>(0);
  const [pulseTick, setPulseTick] = useState<number>(0);
  const [accentPattern, setAccentPattern] = useState<boolean[]>([true, false, false, false]);
  const [mutedBeats, setMutedBeats] = useState<boolean[]>([false, false, false, false]);
  const [countIn, setCountIn] = useState<boolean>(false);
  const [countInBeats, setCountInBeats] = useState<number>(0);
  const [showPresets, setShowPresets] = useState<boolean>(false);
  const [showAccentPresets, setShowAccentPresets] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.7);
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const [soundType, setSoundType] = useState<SoundType>("click");
  const [trainingMode, setTrainingMode] = useState<TrainingMode>("normal");
  const [visualMode, setVisualMode] = useState<VisualMode>("full");
  const [speedIncrement, setSpeedIncrement] = useState<number>(2);
  const [speedBarsInterval, setSpeedBarsInterval] = useState<number>(4);
  const [randomMuteChance, setRandomMuteChance] = useState<number>(25);
  const [sessionTime, setSessionTime] = useState<number>(0);
  const [totalBeats, setTotalBeats] = useState<number>(0);
  const [barCount, setBarCount] = useState<number>(0);
  const [pendulum, setPendulum] = useState<boolean>(false);
  const [flashScreen, setFlashScreen] = useState<boolean>(false);
  const [stickPattern, setStickPattern] = useState<("R" | "L")[]>(["R", "L", "R", "L"]);
  const [showStickPattern, setShowStickPattern] = useState<boolean>(false);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [precisionHits, setPrecisionHits] = useState<number[]>([]);
  const [lastPrecisionScore, setLastPrecisionScore] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"main" | "training" | "settings">("main");

  const audioCtxRef = useRef<AudioContext | null>(null);
  const schedulerRef = useRef<number | null>(null);
  const sessionTimerRef = useRef<number | null>(null);
  const nextNoteTimeRef = useRef<number>(0);
  const currentBeatRef = useRef<number>(0);
  const currentSubBeatRef = useRef<number>(0);
  const barCountRef = useRef<number>(0);
  const lastBeatTimeRef = useRef<number>(0);

  useEffect(() => {
    const newPattern = Array(timeSignature.upper).fill(false);
    newPattern[0] = true;
    setAccentPattern(newPattern);
    setMutedBeats(Array(timeSignature.upper).fill(false));
    const newStickPattern: ("R" | "L")[] = [];
    for (let i = 0; i < timeSignature.upper; i++) {
      newStickPattern.push(i % 2 === 0 ? "R" : "L");
    }
    setStickPattern(newStickPattern);
  }, [timeSignature.upper]);

  useEffect(() => {
    const saved = localStorage.getItem("drumTrainerSessions");
    if (saved) {
      try {
        setSavedSessions(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load sessions");
      }
    }
  }, []);

  useEffect(() => {
    if (savedSessions.length > 0) {
      localStorage.setItem("drumTrainerSessions", JSON.stringify(savedSessions));
    }
  }, [savedSessions]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      switch (e.code) {
        case "Space":
          e.preventDefault();
          setIsPlaying(prev => !prev);
          break;
        case "ArrowUp":
          e.preventDefault();
          setBpm(prev => Math.min(MAX_BPM, prev + 1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setBpm(prev => Math.max(MIN_BPM, prev - 1));
          break;
        case "ArrowLeft":
          e.preventDefault();
          setBpm(prev => Math.max(MIN_BPM, prev - 5));
          break;
        case "ArrowRight":
          e.preventDefault();
          setBpm(prev => Math.min(MAX_BPM, prev + 5));
          break;
        case "KeyT":
          handleTap();
          break;
        case "KeyM":
          setVolume(prev => prev > 0 ? 0 : 0.7);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const playClick = useCallback((time: number, isAccent: boolean, isSubdivision: boolean, isMuted: boolean) => {
    if (isMuted && trainingMode !== "precision") return;
    
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    let freq: number;
    let duration: number;
    let oscType: OscillatorType = "sine";

    switch (soundType) {
      case "wood":
        freq = isAccent ? 800 : isSubdivision ? 400 : 600;
        duration = 0.03;
        oscType = "triangle";
        break;
      case "electronic":
        freq = isAccent ? 3000 : isSubdivision ? 1500 : 2200;
        duration = 0.04;
        oscType = "square";
        break;
      case "drum":
        freq = isAccent ? 200 : isSubdivision ? 100 : 150;
        duration = 0.1;
        oscType = "sine";
        break;
      case "cowbell":
        freq = isAccent ? 800 : isSubdivision ? 600 : 700;
        duration = 0.15;
        oscType = "square";
        break;
      case "hihat":
        freq = isAccent ? 8000 : isSubdivision ? 6000 : 7000;
        duration = 0.05;
        oscType = "sawtooth";
        break;
      default:
        freq = isAccent ? 2400 : isSubdivision ? 1000 : 1600;
        duration = isAccent ? 0.08 : 0.05;
        oscType = "sine";
    }

    filter.type = "lowpass";
    filter.frequency.value = soundType === "hihat" ? 12000 : isAccent ? 4000 : 2500;

    const vol = isSubdivision ? volume * 0.4 : isAccent ? volume : volume * 0.7;

    osc.type = oscType;
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(Math.max(freq * 0.3, 20), time + duration);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + duration + 0.01);
  }, [getAudioContext, volume, soundType, trainingMode]);

  const scheduleNote = useCallback((beatTime: number, beat: number, subBeat: number) => {
    const isDownbeat = beat === 0 && subBeat === 0;
    const isMainBeat = subBeat === 0;
    const isAccent = isMainBeat && accentPattern[beat];
    
    let isMuted = mutedBeats[beat];
    
    if (trainingMode === "random" && isMainBeat) {
      isMuted = Math.random() * 100 < randomMuteChance;
    }
    
    if (trainingMode === "silent" && !isDownbeat) {
      isMuted = true;
    }

    if (isMainBeat || subdivision > 1) {
      playClick(beatTime, isAccent || isDownbeat, !isMainBeat, isMuted);
    }

    const ctx = getAudioContext();
    const delay = Math.max(0, (beatTime - ctx.currentTime) * 1000);

    setTimeout(() => {
      setCurrentBeat(beat);
      setCurrentSubBeat(subBeat);
      lastBeatTimeRef.current = performance.now();
      
      if (isMainBeat) {
        setPulseTick(t => t + 1);
        setTotalBeats(t => t + 1);
        
        if (visualMode === "flash" || flashScreen) {
          document.body.classList.add("timing-flash");
          setTimeout(() => document.body.classList.remove("timing-flash"), 50);
        }
      }
      
      if (isDownbeat) {
        setBarCount(b => {
          const newCount = b + 1;
          barCountRef.current = newCount;
          
          if (trainingMode === "speed" && newCount > 0 && newCount % speedBarsInterval === 0) {
            setBpm(prev => Math.min(MAX_BPM, prev + speedIncrement));
          }
          
          return newCount;
        });
      }
    }, delay);
  }, [accentPattern, mutedBeats, subdivision, playClick, getAudioContext, trainingMode, 
      randomMuteChance, visualMode, flashScreen, speedBarsInterval, speedIncrement]);

  const scheduler = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const scheduleAhead = 0.1;
    const lookahead = 25;

    while (nextNoteTimeRef.current < ctx.currentTime + scheduleAhead) {
      const beat = currentBeatRef.current;
      const subBeat = currentSubBeatRef.current;

      if (countIn && countInBeats > 0) {
        playClick(nextNoteTimeRef.current, countInBeats <= timeSignature.upper, false, false);
        setCountInBeats(prev => prev - 1);
      } else {
        scheduleNote(nextNoteTimeRef.current, beat, subBeat);
      }

      const secondsPerBeat = 60.0 / bpm;
      let noteLength = secondsPerBeat / subdivision;

      if (swing > 0 && subdivision >= 2) {
        const swingRatio = 0.5 + (swing / 100) * 0.25;
        if (subBeat % 2 === 0) {
          noteLength = secondsPerBeat / subdivision * (swingRatio * 2);
        } else {
          noteLength = secondsPerBeat / subdivision * ((1 - swingRatio) * 2);
        }
      }

      nextNoteTimeRef.current += noteLength;

      currentSubBeatRef.current++;
      if (currentSubBeatRef.current >= subdivision) {
        currentSubBeatRef.current = 0;
        currentBeatRef.current++;
        if (currentBeatRef.current >= timeSignature.upper) {
          currentBeatRef.current = 0;
        }
      }
    }

    schedulerRef.current = window.setTimeout(scheduler, lookahead);
  }, [bpm, timeSignature, subdivision, swing, countIn, countInBeats, scheduleNote, playClick, getAudioContext]);

  useEffect(() => {
    if (isPlaying) {
      const ctx = getAudioContext();
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      currentBeatRef.current = 0;
      currentSubBeatRef.current = 0;
      barCountRef.current = 0;
      nextNoteTimeRef.current = ctx.currentTime + 0.05;

      if (countIn) {
        setCountInBeats(timeSignature.upper);
      }

      setBarCount(0);
      scheduler();

      sessionTimerRef.current = window.setInterval(() => {
        setSessionTime(t => t + 1);
      }, 1000);
    } else {
      if (schedulerRef.current) {
        clearTimeout(schedulerRef.current);
        schedulerRef.current = null;
      }
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
      setCurrentBeat(0);
      setCurrentSubBeat(0);
    }

    return () => {
      if (schedulerRef.current) {
        clearTimeout(schedulerRef.current);
        schedulerRef.current = null;
      }
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
    };
  }, [isPlaying, scheduler, getAudioContext, countIn, timeSignature.upper]);

  const handleTogglePlay = () => {
    if (!isPlaying && trainingMode === "speed") {
      setTargetBpm(bpm + speedIncrement * 10);
    }
    setIsPlaying(prev => !prev);
  };

  const clampBpm = (value: number) => Math.min(MAX_BPM, Math.max(MIN_BPM, value));

  const changeBpm = (delta: number) => {
    setBpm(prev => clampBpm(prev + delta));
  };

  const handleDialDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const startY = e.clientY;
    const startBpm = bpm;

    const onMove = (moveEvent: MouseEvent) => {
      const delta = startY - moveEvent.clientY;
      setBpm(clampBpm(startBpm + Math.round(delta / 2)));
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [bpm]);

  const handleDialWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const dir = e.deltaY > 0 ? -1 : 1;
    changeBpm(dir);
  };

  const handleBpmInput: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const value = parseInt(e.target.value || "0", 10);
    if (!Number.isNaN(value)) {
      setBpm(clampBpm(value));
    }
  };

  const handleTap = useCallback(() => {
    const now = performance.now();
    const newTaps = [...tapTimes, now].filter(t => now - t < 3000).slice(-8);
    setTapTimes(newTaps);

    if (newTaps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < newTaps.length; i++) {
        intervals.push(newTaps[i] - newTaps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
      const tapBpm = clampBpm(Math.round(60000 / avgInterval));
      setBpm(tapBpm);
    }

    if (trainingMode === "precision" && isPlaying && lastBeatTimeRef.current > 0) {
      const diff = Math.abs(now - lastBeatTimeRef.current);
      const beatInterval = 60000 / bpm;
      const accuracy = Math.max(0, 100 - (diff / beatInterval) * 200);
      setPrecisionHits(prev => [...prev.slice(-19), accuracy]);
      setLastPrecisionScore(Math.round(accuracy));
    }

    const ctx = getAudioContext();
    if (ctx) {
      playClick(ctx.currentTime, false, false, false);
    }
  }, [tapTimes, trainingMode, isPlaying, bpm, getAudioContext, playClick]);

  const handleAccentToggle = (index: number) => {
    setAccentPattern(prev => {
      const newPattern = [...prev];
      newPattern[index] = !newPattern[index];
      return newPattern;
    });
  };

  const handleMuteToggle = (index: number) => {
    setMutedBeats(prev => {
      const newMuted = [...prev];
      newMuted[index] = !newMuted[index];
      return newMuted;
    });
  };

  const toggleStickHand = (index: number) => {
    setStickPattern(prev => {
      const newPattern = [...prev];
      newPattern[index] = newPattern[index] === "R" ? "L" : "R";
      return newPattern;
    });
  };

  const applyPreset = (preset: DrumPreset) => {
    setBpm(preset.bpm);
    setTimeSignature(preset.timeSignature);
    setSubdivision(preset.subdivision);
    setSwing(preset.swing);
    setShowPresets(false);
    setIsPlaying(false);
  };

  const applyAccentPreset = (preset: AccentPreset) => {
    const newPattern = [...preset.pattern];
    while (newPattern.length < timeSignature.upper) {
      newPattern.push(preset.pattern[newPattern.length % preset.pattern.length]);
    }
    setAccentPattern(newPattern.slice(0, timeSignature.upper));
    setShowAccentPresets(false);
  };

  const saveCurrentSession = () => {
    const name = prompt("Namn på denna inställning:");
    if (name) {
      const session: SavedSession = {
        name,
        bpm,
        timeSignature,
        subdivision,
        swing,
        accentPattern,
      };
      setSavedSessions(prev => [...prev, session]);
    }
  };

  const loadSession = (session: SavedSession) => {
    setBpm(session.bpm);
    setTimeSignature(session.timeSignature);
    setSubdivision(session.subdivision);
    setSwing(session.swing);
    setAccentPattern(session.accentPattern);
    setIsPlaying(false);
  };

  const deleteSession = (index: number) => {
    setSavedSessions(prev => prev.filter((_, i) => i !== index));
  };

  const resetSession = () => {
    setSessionTime(0);
    setTotalBeats(0);
    setBarCount(0);
    setPrecisionHits([]);
    setLastPrecisionScore(null);
  };

  const averagePrecision = precisionHits.length > 0
    ? Math.round(precisionHits.reduce((a, b) => a + b, 0) / precisionHits.length)
    : null;

  const tempoName = getTempoName(bpm);
  const tempoColor = getTempoColor(bpm);
  const knobAngle = ((bpm - MIN_BPM) / (MAX_BPM - MIN_BPM)) * 270 - 135;
  const progressPercent = ((bpm - MIN_BPM) / (MAX_BPM - MIN_BPM)) * 100;

  return (
    <div className={`timing-page ${visualMode === "minimal" ? "timing-minimal" : ""}`}>
      <div className="timing-container">
        <header className="timing-header">
          <h1 className="timing-title">Drum Timing Trainer</h1>
          <div className="timing-stats-bar">
            <span className="timing-stat">
              <span className="timing-stat-icon">⏱</span>
              {formatTime(sessionTime)}
            </span>
            <span className="timing-stat">
              <span className="timing-stat-icon">🥁</span>
              {totalBeats} slag
            </span>
            <span className="timing-stat">
              <span className="timing-stat-icon">📊</span>
              {barCount} takter
            </span>
            {averagePrecision !== null && (
              <span className="timing-stat timing-stat-precision">
                <span className="timing-stat-icon">🎯</span>
                {averagePrecision}%
              </span>
            )}
          </div>
        </header>

        <div className="timing-tabs">
          <button 
            className={`timing-tab ${activeTab === "main" ? "timing-tab-active" : ""}`}
            onClick={() => setActiveTab("main")}
          >
            Metronom
          </button>
          <button 
            className={`timing-tab ${activeTab === "training" ? "timing-tab-active" : ""}`}
            onClick={() => setActiveTab("training")}
          >
            Träning
          </button>
          <button 
            className={`timing-tab ${activeTab === "settings" ? "timing-tab-active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            Inställningar
          </button>
        </div>

        <div className="timing-main-panel">
          {activeTab === "main" && (
            <>
              <section className="timing-beat-display">
                <div className="timing-beat-label">
                  <span className="timing-sig-display">{timeSignature.upper}/{timeSignature.lower}</span>
                  <span className="timing-tempo-badge" style={{ background: tempoColor }}>{tempoName}</span>
                  {trainingMode !== "normal" && (
                    <span className="timing-mode-badge">{trainingMode.toUpperCase()}</span>
                  )}
                </div>

                <div className="timing-beat-indicators">
                  {Array.from({ length: timeSignature.upper }).map((_, idx) => (
                    <div key={idx} className="timing-beat-column">
                      <button
                        className={`timing-beat-dot ${
                          isPlaying && idx === currentBeat ? "timing-beat-dot-active" : ""
                        } ${accentPattern[idx] ? "timing-beat-dot-accent" : ""} ${
                          mutedBeats[idx] ? "timing-beat-dot-muted" : ""
                        }`}
                        onClick={() => handleAccentToggle(idx)}
                        onContextMenu={(e) => { e.preventDefault(); handleMuteToggle(idx); }}
                        title="Vänsterklick: accent | Högerklick: mute"
                      >
                        {mutedBeats[idx] ? "✕" : idx + 1}
                      </button>
                      {showStickPattern && (
                        <button
                          className={`timing-stick-btn ${stickPattern[idx] === "R" ? "timing-stick-r" : "timing-stick-l"}`}
                          onClick={() => toggleStickHand(idx)}
                        >
                          {stickPattern[idx]}
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {subdivision > 1 && (
                  <div className="timing-subdivision-dots">
                    {Array.from({ length: subdivision }).map((_, idx) => (
                      <div
                        key={idx}
                        className={`timing-sub-dot ${
                          isPlaying && idx === currentSubBeat ? "timing-sub-dot-active" : ""
                        }`}
                      />
                    ))}
                  </div>
                )}

                <div className={`timing-pulse-container ${pendulum ? "timing-pendulum-mode" : ""}`}>
                  {pendulum ? (
                    <div 
                      className={`timing-pendulum ${isPlaying ? "timing-pendulum-active" : ""}`}
                      style={{ animationDuration: `${60 / bpm}s` }}
                    >
                      <div className="timing-pendulum-arm" />
                      <div className="timing-pendulum-weight" style={{ background: tempoColor }} />
                    </div>
                  ) : (
                    <div
                      key={pulseTick}
                      className={`timing-pulse-ring ${isPlaying ? "timing-pulse-ring-active" : ""}`}
                      style={{ borderColor: tempoColor }}
                    />
                  )}
                </div>

                {lastPrecisionScore !== null && trainingMode === "precision" && (
                  <div className={`timing-precision-feedback ${lastPrecisionScore >= 80 ? "timing-precision-good" : lastPrecisionScore >= 50 ? "timing-precision-ok" : "timing-precision-bad"}`}>
                    {lastPrecisionScore >= 80 ? "Perfekt!" : lastPrecisionScore >= 50 ? "Bra!" : "Fortsätt öva!"}
                    <span className="timing-precision-score">{lastPrecisionScore}%</span>
                  </div>
                )}
              </section>

              <section className="timing-bpm-section">
                <div
                  className="timing-dial"
                  onWheel={handleDialWheel}
                  onMouseDown={handleDialDrag}
                  title="Dra upp/ner eller scrolla för att ändra BPM"
                >
                  <svg viewBox="0 0 200 200" className="timing-dial-svg">
                    <defs>
                      <linearGradient id="dialGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#60a5fa" />
                        <stop offset="50%" stopColor="#a78bfa" />
                        <stop offset="100%" stopColor="#f472b6" />
                      </linearGradient>
                    </defs>
                    <circle cx="100" cy="100" r="90" className="timing-dial-track" />
                    <circle
                      cx="100"
                      cy="100"
                      r="90"
                      className="timing-dial-progress"
                      style={{
                        strokeDasharray: `${progressPercent * 5.65} 565`,
                        stroke: tempoColor,
                      }}
                    />
                    <line
                      x1="100"
                      y1="100"
                      x2="100"
                      y2="25"
                      className="timing-dial-needle"
                      style={{ transform: `rotate(${knobAngle}deg)`, transformOrigin: "100px 100px" }}
                    />
                    <circle cx="100" cy="100" r="50" className="timing-dial-center" />
                  </svg>
                  <div className="timing-dial-value">
                    <input
                      type="number"
                      min={MIN_BPM}
                      max={MAX_BPM}
                      value={bpm}
                      onChange={handleBpmInput}
                      className="timing-bpm-input"
                    />
                    <span className="timing-bpm-label">BPM</span>
                  </div>
                </div>

                <div className="timing-bpm-buttons">
                  <div className="timing-bpm-row">
                    <button onClick={() => changeBpm(-10)} className="timing-btn-adjust">-10</button>
                    <button onClick={() => changeBpm(-5)} className="timing-btn-adjust">-5</button>
                    <button onClick={() => changeBpm(-1)} className="timing-btn-adjust">-1</button>
                    <button onClick={() => changeBpm(1)} className="timing-btn-adjust">+1</button>
                    <button onClick={() => changeBpm(5)} className="timing-btn-adjust">+5</button>
                    <button onClick={() => changeBpm(10)} className="timing-btn-adjust">+10</button>
                  </div>
                </div>
              </section>

              <section className="timing-controls-grid">
                <div className="timing-control-card">
                  <label className="timing-control-label">Taktart</label>
                  <select
                    value={`${timeSignature.upper}/${timeSignature.lower}`}
                    onChange={(e) => {
                      const [upper, lower] = e.target.value.split("/").map(Number);
                      setTimeSignature({ upper, lower });
                    }}
                    className="timing-select"
                  >
                    {TIME_SIGNATURES.map((ts) => (
                      <option key={`${ts.upper}/${ts.lower}`} value={`${ts.upper}/${ts.lower}`}>
                        {ts.upper}/{ts.lower}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="timing-control-card">
                  <label className="timing-control-label">Underdelning</label>
                  <div className="timing-subdivision-btns">
                    {([1, 2, 3, 4, 6] as Subdivision[]).map((sub) => (
                      <button
                        key={sub}
                        className={`timing-sub-btn ${subdivision === sub ? "timing-sub-btn-active" : ""}`}
                        onClick={() => setSubdivision(sub)}
                      >
                        {sub === 1 ? "1" : sub === 2 ? "2" : sub === 3 ? "3" : sub === 4 ? "4" : "6"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="timing-control-card">
                  <label className="timing-control-label">Swing</label>
                  <div className="timing-swing-btns">
                    {([0, 15, 33, 50, 67] as SwingAmount[]).map((sw) => (
                      <button
                        key={sw}
                        className={`timing-swing-btn ${swing === sw ? "timing-swing-btn-active" : ""}`}
                        onClick={() => setSwing(sw)}
                      >
                        {sw === 0 ? "0" : sw}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="timing-control-card">
                  <label className="timing-control-label">Volym</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="timing-volume-slider"
                  />
                  <span className="timing-volume-value">{Math.round(volume * 100)}%</span>
                </div>
              </section>

              <section className="timing-quick-actions">
                <button className="timing-quick-btn" onClick={() => setShowPresets(!showPresets)}>
                  {showPresets ? "Dölj" : "Presets"}
                </button>
                <button className="timing-quick-btn" onClick={() => setShowAccentPresets(!showAccentPresets)}>
                  Accenter
                </button>
                <button className={`timing-quick-btn ${showStickPattern ? "timing-quick-btn-active" : ""}`} onClick={() => setShowStickPattern(!showStickPattern)}>
                  R/L
                </button>
                <button className={`timing-quick-btn ${countIn ? "timing-quick-btn-active" : ""}`} onClick={() => setCountIn(!countIn)}>
                  Count-in
                </button>
              </section>

              {showPresets && (
                <section className="timing-presets-grid">
                  {DRUM_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      className="timing-preset-btn"
                      onClick={() => applyPreset(preset)}
                    >
                      <span className="timing-preset-icon">{preset.icon}</span>
                      <span className="timing-preset-name">{preset.name}</span>
                      <span className="timing-preset-info">{preset.bpm} BPM</span>
                    </button>
                  ))}
                </section>
              )}

              {showAccentPresets && (
                <section className="timing-accent-presets">
                  {ACCENT_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      className="timing-accent-btn"
                      onClick={() => applyAccentPreset(preset)}
                    >
                      <span className="timing-accent-name">{preset.name}</span>
                      <span className="timing-accent-desc">{preset.description}</span>
                    </button>
                  ))}
                </section>
              )}

              <section className="timing-action-buttons">
                <button
                  className={`timing-play-btn ${isPlaying ? "timing-play-btn-stop" : ""}`}
                  onClick={handleTogglePlay}
                >
                  <span className="timing-play-icon">{isPlaying ? "■" : "▶"}</span>
                  <span>{isPlaying ? "STOPP" : "STARTA"}</span>
                </button>

                <button className="timing-tap-btn" onClick={handleTap}>
                  <span className="timing-tap-text">TAP</span>
                  {tapTimes.length >= 2 && <span className="timing-tap-count">{tapTimes.length} klick</span>}
                </button>
              </section>
            </>
          )}

          {activeTab === "training" && (
            <section className="timing-training-panel">
              <h3 className="timing-section-title">Träningsläge</h3>
              <div className="timing-training-modes">
                {[
                  { mode: "normal" as TrainingMode, name: "Normal", desc: "Standard metronom", icon: "🎵" },
                  { mode: "speed" as TrainingMode, name: "Speed Trainer", desc: `+${speedIncrement} BPM var ${speedBarsInterval}:e takt`, icon: "🚀" },
                  { mode: "precision" as TrainingMode, name: "Precision", desc: "Mät din timing-precision", icon: "🎯" },
                  { mode: "random" as TrainingMode, name: "Random Mute", desc: `${randomMuteChance}% chans att tysta`, icon: "🎲" },
                  { mode: "silent" as TrainingMode, name: "Silent Practice", desc: "Endast nedslag hörs", icon: "🤫" },
                ].map(({ mode, name, desc, icon }) => (
                  <button
                    key={mode}
                    className={`timing-training-mode-btn ${trainingMode === mode ? "timing-training-mode-active" : ""}`}
                    onClick={() => setTrainingMode(mode)}
                  >
                    <span className="timing-training-icon">{icon}</span>
                    <span className="timing-training-name">{name}</span>
                    <span className="timing-training-desc">{desc}</span>
                  </button>
                ))}
              </div>

              {trainingMode === "speed" && (
                <div className="timing-training-options">
                  <div className="timing-option-row">
                    <label>BPM ökning:</label>
                    <select value={speedIncrement} onChange={(e) => setSpeedIncrement(Number(e.target.value))}>
                      {[1, 2, 3, 5, 10].map(n => <option key={n} value={n}>+{n} BPM</option>)}
                    </select>
                  </div>
                  <div className="timing-option-row">
                    <label>Var ... takt:</label>
                    <select value={speedBarsInterval} onChange={(e) => setSpeedBarsInterval(Number(e.target.value))}>
                      {[2, 4, 8, 16].map(n => <option key={n} value={n}>{n} takter</option>)}
                    </select>
                  </div>
                </div>
              )}

              {trainingMode === "random" && (
                <div className="timing-training-options">
                  <div className="timing-option-row">
                    <label>Mute-chans:</label>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      value={randomMuteChance}
                      onChange={(e) => setRandomMuteChance(Number(e.target.value))}
                    />
                    <span>{randomMuteChance}%</span>
                  </div>
                </div>
              )}

              {trainingMode === "precision" && precisionHits.length > 0 && (
                <div className="timing-precision-stats">
                  <div className="timing-precision-chart">
                    {precisionHits.map((hit, i) => (
                      <div
                        key={i}
                        className="timing-precision-bar"
                        style={{ 
                          height: `${hit}%`,
                          background: hit >= 80 ? "#22c55e" : hit >= 50 ? "#fbbf24" : "#ef4444"
                        }}
                      />
                    ))}
                  </div>
                  <div className="timing-precision-avg">
                    Genomsnitt: <strong>{averagePrecision}%</strong>
                  </div>
                </div>
              )}

              <h3 className="timing-section-title">Sparade inställningar</h3>
              <div className="timing-saved-sessions">
                {savedSessions.length === 0 ? (
                  <p className="timing-no-sessions">Inga sparade inställningar ännu</p>
                ) : (
                  savedSessions.map((session, i) => (
                    <div key={i} className="timing-saved-session">
                      <button className="timing-session-load" onClick={() => loadSession(session)}>
                        <span className="timing-session-name">{session.name}</span>
                        <span className="timing-session-info">
                          {session.bpm} BPM • {session.timeSignature.upper}/{session.timeSignature.lower}
                        </span>
                      </button>
                      <button className="timing-session-delete" onClick={() => deleteSession(i)}>✕</button>
                    </div>
                  ))
                )}
              </div>
              <button className="timing-save-btn" onClick={saveCurrentSession}>
                Spara nuvarande inställningar
              </button>
              <button className="timing-reset-btn" onClick={resetSession}>
                Återställ session
              </button>
            </section>
          )}

          {activeTab === "settings" && (
            <section className="timing-settings-panel">
              <h3 className="timing-section-title">Ljud</h3>
              <div className="timing-sound-types">
                {SOUND_TYPES.map(({ type, name, icon }) => (
                  <button
                    key={type}
                    className={`timing-sound-btn ${soundType === type ? "timing-sound-btn-active" : ""}`}
                    onClick={() => setSoundType(type)}
                  >
                    <span>{icon}</span>
                    <span>{name}</span>
                  </button>
                ))}
              </div>

              <h3 className="timing-section-title">Visuellt läge</h3>
              <div className="timing-visual-modes">
                {[
                  { mode: "full" as VisualMode, name: "Fullständig" },
                  { mode: "minimal" as VisualMode, name: "Minimal" },
                  { mode: "pulse" as VisualMode, name: "Endast puls" },
                  { mode: "flash" as VisualMode, name: "Skärmblink" },
                ].map(({ mode, name }) => (
                  <button
                    key={mode}
                    className={`timing-visual-btn ${visualMode === mode ? "timing-visual-btn-active" : ""}`}
                    onClick={() => setVisualMode(mode)}
                  >
                    {name}
                  </button>
                ))}
              </div>

              <h3 className="timing-section-title">Alternativ</h3>
              <div className="timing-options-list">
                <label className="timing-option-checkbox">
                  <input type="checkbox" checked={pendulum} onChange={(e) => setPendulum(e.target.checked)} />
                  <span>Pendel-läge</span>
                </label>
                <label className="timing-option-checkbox">
                  <input type="checkbox" checked={flashScreen} onChange={(e) => setFlashScreen(e.target.checked)} />
                  <span>Skärmblink på varje slag</span>
                </label>
                <label className="timing-option-checkbox">
                  <input type="checkbox" checked={countIn} onChange={(e) => setCountIn(e.target.checked)} />
                  <span>Inräkning ({timeSignature.upper} slag)</span>
                </label>
              </div>

              <h3 className="timing-section-title">Tangentbordsgenvägar</h3>
              <div className="timing-shortcuts">
                <div className="timing-shortcut"><kbd>Space</kbd> Starta/Stoppa</div>
                <div className="timing-shortcut"><kbd>↑</kbd><kbd>↓</kbd> BPM ±1</div>
                <div className="timing-shortcut"><kbd>←</kbd><kbd>→</kbd> BPM ±5</div>
                <div className="timing-shortcut"><kbd>T</kbd> Tap tempo</div>
                <div className="timing-shortcut"><kbd>M</kbd> Mute/Unmute</div>
              </div>
            </section>
          )}
        </div>

        <footer className="timing-footer">
          <p>Vänsterklick på slag för accent • Högerklick för mute • Dra ratten för BPM</p>
        </footer>
      </div>
    </div>
  );
}
