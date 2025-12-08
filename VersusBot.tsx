import { useEffect, useState } from "react";
import VersusDrumVisualizer from "../components/VersusDrumVisualizer";

type Genre = "Rock" | "Pop" | "Metal" | "HipHop" | "Electronic";

interface VersusSong {
  name: string;
  genre: Genre;
}

const ALL_SONGS: VersusSong[] = [
  { name: "Crazy Train - Ozzy Osbourne", genre: "Rock" },
  { name: "Back in Black - AC/DC", genre: "Rock" },
  { name: "electric", genre: "Rock" },
];

function getRandomSong(): { genre: Genre; song: VersusSong } {
  const genres: Genre[] = ["Rock", "Pop", "Metal", "HipHop", "Electronic"];
  const availableGenres = genres.filter((g) =>
    ALL_SONGS.some((s) => s.genre === g)
  );
  const genre =
    availableGenres[Math.floor(Math.random() * availableGenres.length)];
  const songsInGenre = ALL_SONGS.filter((s) => s.genre === genre);
  const song =
    songsInGenre[Math.floor(Math.random() * songsInGenre.length)];
  return { genre, song };
}

type BotDifficulty = "easy" | "medium" | "hard" | "insane";

export default function VersusBot() {
  const [difficulty, setDifficulty] = useState<BotDifficulty>("medium");
  const [genre, setGenre] = useState<Genre | null>(null);
  const [song, setSong] = useState<VersusSong | null>(null);
  const [state, setState] = useState<"setup" | "countdown" | "running">(
    "setup"
  );
  const [countdown, setCountdown] = useState(3);
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);

  const total = Math.max(playerScore + botScore, 1);
  const playerPct = (playerScore / total) * 100;
  const botPct = (botScore / total) * 100;

  const startMatch = () => {
    const { genre, song } = getRandomSong();
    setGenre(genre);
    setSong(song);
    setPlayerScore(0);
    setBotScore(0);
    setCountdown(3);
    setState("countdown");
  };

  useEffect(() => {
    if (state !== "countdown") return;
    if (countdown <= 0) {
      setState("running");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [state, countdown]);

  useEffect(() => {
    if (state !== "running") return;
    const t = setInterval(() => {
      const playerGain = 3 + Math.floor(Math.random() * 6);

      let botGainBase = 3;
      if (difficulty === "easy") botGainBase = 2;
      if (difficulty === "medium") botGainBase = 3;
      if (difficulty === "hard") botGainBase = 4;
      if (difficulty === "insane") botGainBase = 5;

      const botGain = botGainBase + Math.floor(Math.random() * 5);

      setPlayerScore((s) => s + playerGain);
      setBotScore((s) => s + botGain);
    }, 1500);

    return () => clearInterval(t);
  }, [state, difficulty]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, #1d2a4a, #020617)",
        color: "#e5e7eb",
        padding: "16px 10px 32px",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            marginBottom: 18,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "1.6rem",
                fontWeight: 700,
                marginBottom: 4,
              }}
            >
              🤖 Versus Bot
            </h1>
            {song && genre ? (
              <p style={{ margin: 0, fontSize: ".95rem", color: "#9ca3af" }}>
                Genre: <strong>{genre}</strong> · Låt:{" "}
                <strong>{song.name}</strong>
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: ".95rem", color: "#9ca3af" }}>
                Välj svårighetsgrad och starta en match mot AI:n.
              </p>
            )}
          </div>

          <div
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: "1px solid rgba(96,165,250,0.7)",
              background:
                "linear-gradient(90deg,rgba(15,23,42,0.9),rgba(30,64,175,0.9))",
              fontSize: ".9rem",
            }}
          >
            MIDI-läge aktivt · 🎧 Anslut ditt trumset via USB/MIDI
          </div>
        </header>

        <section
          style={{
            marginBottom: 18,
            padding: "12px 14px",
            borderRadius: 16,
            border: "1px solid rgba(55,65,81,0.9)",
            background:
              "linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))",
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                marginBottom: 6,
                fontSize: "1.1rem",
                fontWeight: 600,
              }}
            >
              Välj svårighetsgrad
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: ".9rem",
                color: "#9ca3af",
                maxWidth: 420,
              }}
            >
              AI-botens precision ökar ju högre svårighetsgrad du väljer.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
            }}
          >
            {(
              [
                { id: "easy", label: "Lätt" },
                { id: "medium", label: "Medel" },
                { id: "hard", label: "Svår" },
                { id: "insane", label: "Extrem" },
              ] as { id: BotDifficulty; label: string }[]
            ).map((opt) => {
              const active = difficulty === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setDifficulty(opt.id)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    border: active
                      ? "1px solid rgba(59,130,246,1)"
                      : "1px solid rgba(75,85,99,0.8)",
                    background: active
                      ? "linear-gradient(120deg,#1d4ed8,#3b82f6)"
                      : "rgba(15,23,42,0.9)",
                    color: active ? "#fff" : "#e5e7eb",
                    fontSize: ".9rem",
                    cursor: "pointer",
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}

            <button
              onClick={startMatch}
              style={{
                marginLeft: 8,
                padding: "9px 18px",
                borderRadius: 999,
                border: "none",
                background:
                  "linear-gradient(120deg,#22c55e,#16a34a)",
                color: "#f9fafb",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: ".95rem",
              }}
            >
              {state === "running" ? "Starta om match" : "Starta match"}
            </button>
          </div>
        </section>

        <div
          style={{
            marginBottom: 18,
            padding: "10px 12px",
            borderRadius: 14,
            background:
              "linear-gradient(90deg,rgba(15,23,42,0.95),rgba(3,7,18,0.98))",
            border: "1px solid rgba(55,65,81,0.9)",
            boxShadow: "0 20px 45px rgba(15,23,42,0.9)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
              fontSize: ".95rem",
              fontWeight: 600,
            }}
          >
            <span style={{ color: "#bfdbfe" }}>
              DU · {playerScore} poäng
            </span>
            <span style={{ color: "#fed7aa" }}>
              BOT · {botScore} poäng
            </span>
          </div>

          <div
            style={{
              position: "relative",
              height: 16,
              borderRadius: 999,
              overflow: "hidden",
              background: "linear-gradient(90deg,#0f172a,#020617)",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${playerPct}%`,
                background:
                  "linear-gradient(90deg,#22c55e,#38bdf8)",
                transition: "width .3s ease-out",
              }}
            />
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                width: `${botPct}%`,
                background:
                  "linear-gradient(90deg,#f97316,#ef4444)",
                transition: "width .3s ease-out",
              }}
            />
          </div>

          {state === "countdown" && (
            <p
              style={{
                marginTop: 8,
                textAlign: "center",
                fontSize: "1.2rem",
                fontWeight: 700,
                color: "#e5e7eb",
              }}
            >
              Startar om {countdown}...
            </p>
          )}
          {state === "running" && (
            <p
              style={{
                marginTop: 8,
                textAlign: "center",
                fontSize: ".9rem",
                color: "#9ca3af",
              }}
            >
              Spela med i Versus-panelen nedan – må bästa trummis vinna!
            </p>
          )}
        </div>

        <div
          style={{
            marginTop: 12,
            borderRadius: 18,
            border: "1px solid rgba(30,64,175,0.6)",
            boxShadow: "0 25px 60px rgba(15,23,42,0.95)",
            overflow: "hidden",
            background: "rgba(15,23,42,0.9)",
          }}
        >
          <VersusDrumVisualizer songName={song ? song.name : undefined} />
        </div>
      </div>
    </div>
  );
}
