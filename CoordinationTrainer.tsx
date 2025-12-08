// src/pages/CoordinationTrainer.tsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Tone from "tone";
import "./CoordinationTrainer.css";

type Limb = "hihat" | "snare" | "kick";

interface PatternStep {
  id: string;
  title: string;
  focus: string;
  instructions: string;
  hihat: string; // 16 steg, "x" = slag, "-" = tyst
  snare: string;
  kick: string;
}

interface PatternDef {
  id: string;
  name: string;
  genre: string;
  level: "Lätt" | "Medel" | "Svår";
  description: string;
  steps: PatternStep[];
  recommendedBpm: number[];
}

const PATTERNS: PatternDef[] = [
  {
    id: "rock_basic",
    name: "Rock-groove 1",
    genre: "Rock",
    level: "Lätt",
    description: "Klassisk rock-beat: hi-hat i åttondelar, virvel på 2 & 4, kick på 1 & 3.",
    recommendedBpm: [70, 90, 110],
    steps: [
      {
        id: "rock_basic_step1",
        title: "Steg 1 – Bara hi-hat",
        focus: "Högerhand / hi-hat",
        instructions:
          "Spela jämna åttondelar på hi-hat. Räkna högt: '1 & 2 & 3 & 4 &'. Försök hålla samma styrka på alla slag.",
        hihat: "x-x-x-x-x-x-x-x-",
        snare: "----------------",
        kick: "----------------",
      },
      {
        id: "rock_basic_step2",
        title: "Steg 2 – Lägg till virvel",
        focus: "Hi-hat + virvel",
        instructions:
          "Behåll hi-hat. Lägg nu till virvel på slag 2 och 4. Tänk: '1 & 2 & 3 & 4 &' där 2 och 4 är virvel.",
        hihat: "x-x-x-x-x-x-x-x-",
        snare: "----x-------x---", // 2 & 4 (om 16-delar)
        kick: "----------------",
      },
      {
        id: "rock_basic_step3",
        title: "Steg 3 – Fullt beat",
        focus: "Hi-hat + virvel + kick",
        instructions:
          "Nu lägger du till kick på 1 och 3. Det här är ett standardrock-beat som används i massor av låtar.",
        hihat: "x-x-x-x-x-x-x-x-",
        snare: "----x-------x---",
        kick: "x-------x-------", // 1 & 3
      },
    ],
  },
  {
    id: "funk_sync",
    name: "Funk-groove 1",
    genre: "Funk",
    level: "Medel",
    description:
      "Lite mer synkoperat – perfekt för att träna timing mellan hi-hat, virvel och kick.",
    recommendedBpm: [80, 100, 115],
    steps: [
      {
        id: "funk_step1",
        title: "Steg 1 – Hi-hat sextondelar",
        focus: "Hi-hat",
        instructions:
          "Spela sextondelar på hi-hat. Räkna '1 e & a 2 e & a...' lugnt. Försök få alla slag jämna.",
        hihat: "xxxxxxxxxxxxxxxx",
        snare: "----------------",
        kick: "----------------",
      },
      {
        id: "funk_step2",
        title: "Steg 2 – Lägg till virvel",
        focus: "Hi-hat + virvel",
        instructions:
          "Lägg till virvel på 2 och 4 medan du behåller sextondelarna på hi-hat. Känn pulsen i 2 och 4.",
        hihat: "xxxxxxxxxxxxxxxx",
        snare: "----x-------x---",
        kick: "----------------",
      },
      {
        id: "funk_step3",
        title: "Steg 3 – Synkad kick",
        focus: "Koordination",
        instructions:
          "Nu lägger du till en lite mer funky kick. Ta det långsamt först – det viktigaste är att inte stressa.",
        hihat: "xxxxxxxxxxxxxxxx",
        snare: "----x-------x---",
        kick: "x---x-x---x-----",
      },
    ],
  },
  {
    id: "shuffle",
    name: "Shuffle-groove",
    genre: "Blues / Shuffle",
    level: "Medel",
    description:
      "Shuffle-feel – perfekt för blues och rock'n'roll. Tänk sväng, inte rak takt.",
    recommendedBpm: [90, 110, 130],
    steps: [
      {
        id: "shuffle_step1",
        title: "Steg 1 – Hi-hat shuffle",
        focus: "Hi-hat feel",
        instructions:
          "Spela 'triol-feel' på hi-hat: starkare på första, lite svagare på nästa. Lyssna på känslan.",
        hihat: "x-x-x-x-x-x-x-x-",
        snare: "----------------",
        kick: "----------------",
      },
      {
        id: "shuffle_step2",
        title: "Steg 2 – Lägg till virvel",
        focus: "Hi-hat + virvel",
        instructions:
          "Lägg till virvel på 2 och 4, men behåll samma lösa känsla i hi-haten.",
        hihat: "x-x-x-x-x-x-x-x-",
        snare: "----x-------x---",
        kick: "----------------",
      },
      {
        id: "shuffle_step3",
        title: "Steg 3 – Shuffle-groove",
        focus: "Fullt groove",
        instructions:
          "Nu lägger du till en enkel kick. Lyssna mer på svänget än på att alla slag är exakt lika starka.",
        hihat: "x-x-x-x-x-x-x-x-",
        snare: "----x-------x---",
        kick: "x---x-------x---",
      },
    ],
  },
];

const STEPS_PER_BAR = 16;

const CoordinationTrainer: React.FC = () => {
  const navigate = useNavigate();

  const [selectedPatternId, setSelectedPatternId] = useState<string>("rock_basic");
  const [selectedStepId, setSelectedStepId] = useState<string>("rock_basic_step1");
  const [bpm, setBpm] = useState<number>(80);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  const [loopsPlayed, setLoopsPlayed] = useState<number>(0);

  const kickRef = useRef<Tone.MembraneSynth | null>(null);
  const snareRef = useRef<Tone.NoiseSynth | null>(null);
  const hihatRef = useRef<Tone.NoiseSynth | null>(null);
  const loopIdRef = useRef<number | null>(null);

  // 🔊 initiera "trumljud"
  useEffect(() => {
    const kick = new Tone.MembraneSynth({
      pitchDecay: 0.01,
      octaves: 4,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.4 },
    }).toDestination();

    const snare = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.25, sustain: 0 },
    }).toDestination();

    const hihat = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0 },
    }).toDestination();

    kickRef.current = kick;
    snareRef.current = snare;
    hihatRef.current = hihat;

    return () => {
      if (loopIdRef.current !== null) {
        Tone.Transport.clear(loopIdRef.current);
        loopIdRef.current = null;
      }
      Tone.Transport.stop();
      Tone.Transport.position = 0;
      kick.dispose();
      snare.dispose();
      hihat.dispose();
    };
  }, []);

  const selectedPattern = PATTERNS.find((p) => p.id === selectedPatternId)!;
  const selectedStep =
    selectedPattern.steps.find((s) => s.id === selectedStepId) ||
    selectedPattern.steps[0];

  // 🎵 start/stop
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;

    if (!isPlaying) {
      if (loopIdRef.current !== null) {
        Tone.Transport.clear(loopIdRef.current);
        loopIdRef.current = null;
      }
      Tone.Transport.stop();
      Tone.Transport.position = 0;
      setCurrentStepIndex(0);
      return;
    }

    if (loopIdRef.current !== null) {
      Tone.Transport.clear(loopIdRef.current);
      loopIdRef.current = null;
    }

    setCurrentStepIndex(0);
    setLoopsPlayed(0);

    const id = Tone.Transport.scheduleRepeat((time) => {
      const stepIndex = Tone.Transport.ticks % STEPS_PER_BAR;
      const step = Number(stepIndex);

      setCurrentStepIndex(step);

      const h = selectedStep.hihat[step] === "x";
      const s = selectedStep.snare[step] === "x";
      const k = selectedStep.kick[step] === "x";

      if (k) {
        kickRef.current?.triggerAttackRelease("C1", "8n", time);
      }
      if (s) {
        snareRef.current?.triggerAttackRelease("8n", time);
      }
      if (h) {
        hihatRef.current?.triggerAttackRelease("16n", time);
      }

      if (step === STEPS_PER_BAR - 1) {
        setLoopsPlayed((prev) => prev + 1);
      }
    }, "16n");

    loopIdRef.current = id;

    Tone.start().catch(() => {});
    Tone.Transport.start("+0.05");

    return () => {
      if (loopIdRef.current !== null) {
        Tone.Transport.clear(loopIdRef.current);
        loopIdRef.current = null;
      }
      Tone.Transport.stop();
    };
  }, [isPlaying, bpm, selectedStep]);

  const handlePatternChange = (id: string) => {
    const pattern = PATTERNS.find((p) => p.id === id);
    if (!pattern) return;
    setSelectedPatternId(id);
    setSelectedStepId(pattern.steps[0].id);
    setLoopsPlayed(0);
  };

  const handleStepChange = (id: string) => {
    setSelectedStepId(id);
    setLoopsPlayed(0);
  };

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleBpmSlider = (value: number) => {
    const v = Math.min(200, Math.max(40, value));
    setBpm(v);
  };

  const gridRows: { limb: Limb; label: string; pattern: string }[] = [
    { limb: "hihat", label: "Hi-hat", pattern: selectedStep.hihat },
    { limb: "snare", label: "Virvel", pattern: selectedStep.snare },
    { limb: "kick", label: "Kick", pattern: selectedStep.kick },
  ];

  return (
    <div className="coord-page">
      <header className="coord-header">
        <button
          className="coord-back-btn"
          onClick={() => navigate("/dashboard")}
        >
          ⬅ Tillbaka till dashboard
        </button>
        <h1>Koordinations- & groove-träning</h1>
        <p>
          Här tränar du på riktiga grooves – med hi-hat, virvel och kick –
          uppdelat i steg. Välj ett mönster, sätt BPM och låt loopen rulla medan
          du spelar med.
        </p>
      </header>

      <main className="coord-layout">
        {/* VÄNSTER – groove & kontroller */}
        <section className="coord-card coord-main-card">
          <div className="coord-top-row">
            <div>
              <h2>{selectedPattern.name}</h2>
              <p className="coord-meta">
                Genre: <span>{selectedPattern.genre}</span> • Nivå:{" "}
                <span>{selectedPattern.level}</span>
              </p>
              <p className="coord-desc">{selectedPattern.description}</p>
            </div>

            <div className="coord-bpm-block">
              <label htmlFor="coord-bpm">
                BPM <span className="coord-bpm-value">{bpm}</span>
              </label>
              <input
                id="coord-bpm"
                type="range"
                min={40}
                max={200}
                value={bpm}
                onChange={(e) => handleBpmSlider(Number(e.target.value))}
              />
              <div className="coord-bpm-row">
                <input
                  type="number"
                  min={40}
                  max={200}
                  value={bpm}
                  onChange={(e) =>
                    handleBpmSlider(Number(e.target.value) || bpm)
                  }
                />
                <div className="coord-bpm-chip-row">
                  {selectedPattern.recommendedBpm.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={
                        "coord-bpm-chip" + (bpm === v ? " coord-bpm-chip-active" : "")
                      }
                      onClick={() => setBpm(v)}
                    >
                      {v} BPM
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Välj pattern & steg */}
          <div className="coord-select-row">
            <div className="coord-select-group">
              <label>Välj groove</label>
              <select
                value={selectedPatternId}
                onChange={(e) => handlePatternChange(e.target.value)}
              >
                {PATTERNS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} – {p.genre}
                  </option>
                ))}
              </select>
            </div>

            <div className="coord-select-group">
              <label>Steg i övningen</label>
              <select
                value={selectedStepId}
                onChange={(e) => handleStepChange(e.target.value)}
              >
                {selectedPattern.steps.map((step) => (
                  <option key={step.id} value={step.id}>
                    {step.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Rutnät som visar slag (16-delar) */}
          <div className="coord-grid-wrapper">
            <div className="coord-grid-header">
              <span>Översikt – 1 takt (16 steg)</span>
              <span className="coord-grid-hint">
                Den ljusa kolumnen visar var loopen är just nu.
              </span>
            </div>
            <div className="coord-grid">
              {/* topp-rad: räkning */}
              <div className="coord-grid-row coord-grid-row-count">
                <span className="coord-grid-label">Räkna</span>
                {Array.from({ length: STEPS_PER_BAR }).map((_, i) => {
                  const beat = Math.floor(i / 4) + 1;
                  const subIndex = i % 4;
                  const subText = ["", "e", "&", "a"][subIndex];
                  return (
                    <div
                      key={i}
                      className={
                        "coord-grid-cell coord-grid-count-cell" +
                        (i === currentStepIndex ? " coord-grid-cell-active" : "")
                      }
                    >
                      {subIndex === 0 ? beat : subText}
                    </div>
                  );
                })}
              </div>

              {/* rader för hi-hat, snare, kick */}
              {gridRows.map((row) => (
                <div key={row.limb} className="coord-grid-row">
                  <span className="coord-grid-label">{row.label}</span>
                  {Array.from({ length: STEPS_PER_BAR }).map((_, i) => {
                    const hit = row.pattern[i] === "x";
                    return (
                      <div
                        key={i}
                        className={
                          "coord-grid-cell" +
                          (hit ? " coord-grid-cell-hit" : "") +
                          (i === currentStepIndex ? " coord-grid-cell-active" : "")
                        }
                      >
                        {hit ? "●" : ""}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Kontroller */}
          <div className="coord-actions">
            <button
              type="button"
              className={
                "coord-main-btn " +
                (isPlaying ? "coord-main-btn-stop" : "coord-main-btn-start")
              }
              onClick={handleTogglePlay}
            >
              {isPlaying ? "Stoppa loop" : "Starta loop"}
            </button>

            <div className="coord-loops-info">
              <span className="coord-loops-label">Spelade takter:</span>
              <span className="coord-loops-value">{loopsPlayed}</span>
            </div>
          </div>
        </section>

        {/* HÖGER – instruktioner & övningsplan */}
        <section className="coord-card coord-side-card">
          <h2>{selectedStep.title}</h2>
          <p className="coord-focus">Fokus: {selectedStep.focus}</p>
          <p className="coord-step-text">{selectedStep.instructions}</p>

          <div className="coord-practice-box">
            <h3>Övningsplan</h3>
            <ul>
              <li>
                Spela <strong>minst 3–5 takter</strong> utan att tappa bort dig –
                börja på lägsta rekommenderade BPM.
              </li>
              <li>
                När det känns stabilt: höj till nästa{" "}
                <strong>rekommenderade BPM</strong>.
              </li>
              <li>
                Behåll <strongj>kroppen avslappnad</strongj> – om du blir spänd,
                sänk tempot igen.
              </li>
              <li>
                Titta inte hela tiden på skärmen – lyssna på känslan i groovet.
              </li>
            </ul>
          </div>

          <div className="coord-tip-box">
            <h3>Proffstips</h3>
            <ul>
              <li>
                Prova samma groove med <strong>svagare hi-hat</strong> och lite
                starkare virvel – det får beatet att låta mer “proffsigt”.
              </li>
              <li>
                När du kan sista steget stabilt:{" "}
                <strong>backa till Steg 1</strong> och känn hur mycket lättare
                det känns nu.
              </li>
              <li>
                Du kan kombinera den här sidan med{" "}
                <strong>Timing-tränaren</strong> för att först jobba med klicket
                och sen lägga på groove.
              </li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
};

export default CoordinationTrainer;
