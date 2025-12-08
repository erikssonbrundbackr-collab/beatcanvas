// src/pages/FreeDrums.tsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as Tone from "tone";
import "./FreeDrums.css";

type DrumId =
  | "kick"
  | "snare"
  | "hihat"
  | "tom1"
  | "tom2"
  | "floor"
  | "crash"
  | "ride";

type DrumPadConfig = {
  id: DrumId;
  label: string;
  key: string;
  keyLabel: string;
};

type GameLaneId = "hihat" | "snare" | "tom1" | "tom2" | "floor" | "kick";
type GameStyle = "standard" | "rock" | "jazz";
type GameDifficulty = "easy" | "medium" | "hard";

interface GameNote {
  id: number;
  drumId: GameLaneId;
  laneIndex: number;
  y: number; // 0 = toppen, 100 = längst ner (träffzonen)
}

// 🔤 Tangenter för spel-läget: D F G H J K (vänster → höger)
const DRUM_PADS: DrumPadConfig[] = [
  { id: "crash", label: "Crash", key: "q", keyLabel: "Q" },
  { id: "ride", label: "Ride", key: "e", keyLabel: "E" },
  { id: "tom1", label: "High tom", key: "g", keyLabel: "G" },
  { id: "tom2", label: "Mid tom", key: "h", keyLabel: "H" },
  { id: "hihat", label: "Hi-hat", key: "d", keyLabel: "D" },
  { id: "snare", label: "Virvel", key: "f", keyLabel: "F" },
  { id: "floor", label: "Golvtom", key: "j", keyLabel: "J" },
  { id: "kick", label: "Kick", key: "k", keyLabel: "K" },
];

// 6 banor – mer som ett riktigt “piano tiles”-bräde
const GAME_LANES: GameLaneId[] = [
  "hihat",
  "snare",
  "tom1",
  "tom2",
  "floor",
  "kick",
];

// stil → vilka banor som prioriteras
const STYLE_LANE_POOL: Record<GameStyle, GameLaneId[]> = {
  standard: GAME_LANES,
  rock: ["kick", "snare", "hihat", "kick", "snare", "kick"],
  jazz: ["hihat", "snare", "tom1", "tom2", "floor", "hihat"],
};

const FreeDrums: React.FC = () => {
  const navigate = useNavigate();

  // 🔊 ljud
  const [ready, setReady] = useState(false);
  const playersRef = useRef<Tone.Players | null>(null);

  // 🥁 fri-spel (virtuella trumsetet)
  const [activePad, setActivePad] = useState<DrumId | null>(null);

  // 🎮 Magic Tiles-läge
  const [gameActive, setGameActive] = useState(false); // om spelbrädet visas
  const [gameRunning, setGameRunning] = useState(false); // om blocken rör sig
  const [gameOver, setGameOver] = useState(false);

  const [style, setStyle] = useState<GameStyle>("standard");
  const [difficulty, setDifficulty] = useState<GameDifficulty>("easy");

  const [notes, setNotes] = useState<GameNote[]>([]);
  const notesRef = useRef<GameNote[]>([]);
  const noteIdRef = useRef(0);
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const [hits, setHits] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lastResult, setLastResult] = useState<"hit" | "miss" | null>(null);

  // 🔊 ladda samples
  useEffect(() => {
    const reverb = new Tone.Reverb({
      decay: 1.8,
      wet: 0.25,
    });

    const players = new Tone.Players(
      {
        kick: "https://tonejs.github.io/audio/drum-samples/acoustic-kit/kick.mp3",
        snare:
          "https://tonejs.github.io/audio/drum-samples/acoustic-kit/snare.mp3",
        hihat:
          "https://tonejs.github.io/audio/drum-samples/acoustic-kit/hihat.mp3",
        crash:
          "https://oramics.github.io/sampled/DM/TR-909/Detroit/samples/cymbal.wav",
        ride:
          "https://oramics.github.io/sampled/DM/TR-909/Detroit/samples/cymbal.wav",
        tom1:
          "https://tonejs.github.io/audio/drum-samples/acoustic-kit/snare.mp3",
        tom2:
          "https://tonejs.github.io/audio/drum-samples/acoustic-kit/snare.mp3",
        floor:
          "https://tonejs.github.io/audio/drum-samples/acoustic-kit/snare.mp3",
      },
      () => setReady(true)
    );

    players.volume.value = -3;
    players.connect(Tone.getDestination());
    players.connect(reverb);
    reverb.toDestination();

    playersRef.current = players;

    return () => {
      players.dispose();
      reverb.dispose();
    };
  }, []);

  const triggerDrum = async (id: DrumId) => {
    const players = playersRef.current;
    if (!players) return;

    await Tone.start().catch(() => {});

    try {
      players.player(id).start();
    } catch {
      // ignore
    }
  };

  const flashPad = (id: DrumId) => {
    setActivePad(id);
    setTimeout(() => {
      setActivePad((cur) => (cur === id ? null : cur));
    }, 90);
  };

  const handlePlayPad = (padId: DrumId) => {
    flashPad(padId);
    triggerDrum(padId);
    handleGameHit(padId);
  };

  // 🎮 träff/miss i spel-läget
  const handleGameHit = (padId: DrumId) => {
    if (!gameActive || !gameRunning) return;

    if (!GAME_LANES.includes(padId as GameLaneId)) {
      // slag på “fel” trumma direkt = game over
      setGameRunning(false);
      setGameOver(true);
      setLastResult("miss");
      setCombo(0);
      return;
    }

    const laneDrum = padId as GameLaneId;
    const hitMin = 75;
    const hitMax = 95;

    let bestIndex = -1;
    let bestDist = Infinity;

    notesRef.current.forEach((note, index) => {
      if (note.drumId !== laneDrum) return;
      if (note.y < hitMin || note.y > hitMax) return;

      const dist = Math.abs(note.y - 85);
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = index;
      }
    });

    if (bestIndex === -1) {
      // ingen tile i träffzonen → game over
      setGameRunning(false);
      setGameOver(true);
      setLastResult("miss");
      setCombo(0);
      return;
    }

    // träff – ta bort noten
    const newNotes = [...notesRef.current];
    newNotes.splice(bestIndex, 1);
    notesRef.current = newNotes;
    setNotes(newNotes);

    setHits((h) => h + 1);
    setCombo((c) => c + 1);
    setLastResult("hit");
  };

  // 🎮 animation – flytta tiles nedåt
  useEffect(() => {
    if (!gameActive || !gameRunning) {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    // svårighet → fart
    let speed = 50; // % per sekund
    if (difficulty === "medium") speed = 70;
    if (difficulty === "hard") speed = 92;

    const step = (time: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time;
      }
      const deltaSec = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      let missed = false;

      notesRef.current = notesRef.current
        .map((note) => ({ ...note, y: note.y + deltaSec * speed }))
        .filter((note) => {
          if (note.y > 105) {
            missed = true;
            return false;
          }
          return true;
        });

      if (missed) {
        // släpper man en tile → game over
        setGameRunning(false);
        setGameOver(true);
        setLastResult("miss");
        setCombo(0);
      }

      setNotes([...notesRef.current]);

      if (gameRunning) {
        animRef.current = requestAnimationFrame(step);
      }
    };

    animRef.current = requestAnimationFrame(step);

    return () => {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
      lastTimeRef.current = null;
    };
  }, [gameActive, gameRunning, difficulty]);

  // 🎮 spawn tiles
  useEffect(() => {
    if (!gameActive || !gameRunning) return;

    // svårighet → hur ofta det spawns
    let spawnIntervalMs = 850;
    if (difficulty === "medium") spawnIntervalMs = 650;
    if (difficulty === "hard") spawnIntervalMs = 500;

    const lanePool = STYLE_LANE_POOL[style];

    const interval = setInterval(() => {
      const poolIndex = Math.floor(Math.random() * lanePool.length);
      const chosenDrum = lanePool[poolIndex];
      const laneIndex = GAME_LANES.indexOf(chosenDrum);
      if (laneIndex === -1) return;

      const newNote: GameNote = {
        id: noteIdRef.current++,
        drumId: chosenDrum,
        laneIndex,
        y: 0,
      };

      notesRef.current = [...notesRef.current, newNote];
      setNotes([...notesRef.current]);
    }, spawnIntervalMs);

    return () => clearInterval(interval);
  }, [gameActive, gameRunning, style, difficulty]);

  const resetGame = () => {
    notesRef.current = [];
    setNotes([]);
    setHits(0);
    setCombo(0);
    setLastResult(null);
    setGameOver(false);
  };

  const toggleGame = () => {
    if (!gameActive) {
      // starta spelläge
      setGameActive(true);
      resetGame();
      setGameRunning(true);
    } else {
      // stäng av spelläge helt
      setGameActive(false);
      setGameRunning(false);
      resetGame();
    }
  };

  // 🎹 tangentbord (fri-spel + spel)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const pad = DRUM_PADS.find((p) => p.key === k);
      if (!pad) return;
      e.preventDefault();
      handlePlayPad(pad.id);
    };

    const handleKeyUp = () => setActivePad(null);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="free-drums-page">
      <header className="free-drums-header">
        <button className="free-back-btn" onClick={() => navigate("/dashboard")}>
          ⬅ Tillbaka till dashboard
        </button>
        <h1>Digitalt trumset – spela fritt & Magic Tiles</h1>
        <p>
          Välj själv: spela fritt på ett virtuellt trumset eller slå på{" "}
          <strong>spelläget</strong> och följ blocken i raka banor. Träffa när
          färgen passerar genom den vita linjen – missar du en tile åker du ut.
        </p>
        {!ready && (
          <p className="free-drums-loading">
            Laddar trumljud… första gången kan det ta någon sekund.
          </p>
        )}
      </header>

      <main className="free-drums-main">
        {/* Vänster: antingen fri-spel (trumset) eller Magic Tiles-board */}
        <div className="free-drums-kit">
          {!gameActive && (
            <>
              {DRUM_PADS.map((pad) => (
                <button
                  key={pad.id}
                  className={
                    "drum-pad drum-pad-" +
                    pad.id +
                    (activePad === pad.id ? " drum-pad-active" : "")
                  }
                  onClick={() => handlePlayPad(pad.id)}
                >
                  <span className="drum-pad-key">{pad.keyLabel}</span>
                  <span className="drum-pad-label">{pad.label}</span>
                </button>
              ))}
            </>
          )}

          {gameActive && (
            <div className="magic-board">
              <div className="magic-hint">
                Titta på den vita linjen och de stora rutorna längst ned.
                Tryck när blocket passerar linjen – klicka i rutan eller använd{" "}
                <strong>D F G H J K</strong>.
              </div>
              <div className="magic-lanes">
                {GAME_LANES.map((laneDrum, laneIndex) => {
                  const padInfo = DRUM_PADS.find((p) => p.id === laneDrum)!;
                  return (
                    <div key={laneDrum} className="magic-lane">
                      {/* tiles */}
                      {notes
                        .filter((n) => n.laneIndex === laneIndex)
                        .map((note) => (
                          <div
                            key={note.id}
                            className="magic-note"
                            style={{ top: `${note.y}%` }}
                          />
                        ))}

                      {/* träff-linje */}
                      <div className="magic-hitzone" />

                      {/* klickbar tile längst ned – som Magic Tiles */}
                      <button
                        type="button"
                        className="magic-hitpad"
                        onClick={() => handlePlayPad(laneDrum)}
                      >
                        <span className="magic-hitpad-key">
                          {padInfo.keyLabel}
                        </span>
                        <span className="magic-hitpad-label">
                          {padInfo.label}
                        </span>
                        <span className="magic-hitpad-hint">Klicka här</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {gameOver && (
                <div className="magic-overlay">
                  <div className="magic-overlay-card">
                    <h3>Game over</h3>
                    <p>Du klarade {hits} träffar innan du missade.</p>
                    <button
                      type="button"
                      onClick={() => {
                        resetGame();
                        setGameRunning(true);
                      }}
                    >
                      Spela igen
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Höger: spelläge + tips */}
        <div className="free-drums-side">
          <section className="free-drums-trainer">
            <h2>🎮 Spelläge – raka banor</h2>
            <p>
              När spelläget är på ser du sex raka banor:{" "}
              <strong>
                Hi-hat, Virvel, High tom, Mid tom, Golvtom, Kick
              </strong>
              . Klicka på de stora rutorna längst ner eller använd tangenterna{" "}
              <strong>D, F, G, H, J, K</strong> när blocket passerar den vita
              linjen.
            </p>

            <div className="trainer-controls">
              <div className="trainer-select">
                <label>Stil</label>
                <select
                  value={style}
                  onChange={(e) =>
                    setStyle(e.target.value as GameStyle)
                  }
                >
                  <option value="standard">Standard</option>
                  <option value="rock">Rock</option>
                  <option value="jazz">Jazz</option>
                </select>
              </div>
              <div className="trainer-select">
                <label>Svårighet</label>
                <select
                  value={difficulty}
                  onChange={(e) =>
                    setDifficulty(e.target.value as GameDifficulty)
                  }
                >
                  <option value="easy">Lätt</option>
                  <option value="medium">Medel</option>
                  <option value="hard">Svår</option>
                </select>
              </div>
            </div>

            <button
              className={
                "trainer-toggle-btn " +
                (gameActive ? "trainer-toggle-on" : "trainer-toggle-off")
              }
              type="button"
              onClick={toggleGame}
            >
              {gameActive ? "Stäng av spelläge" : "Starta spelläge"}
            </button>

            <div className="trainer-stats">
              <span>Träffar: {hits}</span>
              <span>Combo: {combo}</span>
              <span>
                Status:{" "}
                {gameOver ? "Game over" : gameActive ? "I gång" : "Av"}
              </span>
            </div>

            {lastResult === "hit" && !gameOver && (
              <div className="trainer-feedback trainer-feedback-hit">
                ✔ Snygg träff!
              </div>
            )}
            {lastResult === "miss" && (
              <div className="trainer-feedback trainer-feedback-miss">
                ✖ Miss – du åkte ut. Starta om för att försöka slå ditt rekord.
              </div>
            )}

            <p className="trainer-tip">
              Lätt = lite långsammare och glesare tiles. Svår = snabbt tempo och
              tätt mellan blocken. Rock fokuserar mer på kick + virvel, Jazz
              använder mer toms och hi-hat.
            </p>
          </section>

          <section className="free-drums-help">
            <h2>🥁 Fri-spel – virtuellt set</h2>
            <ul>
              <li>
                När spelläget är <strong>av</strong> ser du ett virtuellt
                trumset uppifrån – klicka eller använd tangenterna.
              </li>
              <li>
                Vänster hand: Hi-hat (D), Virvel (F). Höger hand:
                toms/cymbaler (G/H/J/Q/E). Kick: K.
              </li>
              <li>
                Testa ett enkelt groove:{" "}
                <em>kick – hi-hat – virvel – hi-hat</em> i loop, precis som i
                en riktig låt.
              </li>
            </ul>
            <p className="free-drums-note">
              Vi kan senare koppla både fri-spel och Magic Tiles till riktiga
              låtar i DrumVisualizer och olika “song levels” (rock, jazz osv).
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default FreeDrums;
