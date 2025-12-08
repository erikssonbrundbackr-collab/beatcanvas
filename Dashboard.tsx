import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logoutUser } from "../authService";
import "./Dashboard.css";
import { socket } from "../socket";

interface ChatMessage {
  user: string;
  text: string;
  timestamp: number;
  id?: string;
}

interface UserSettings {
  theme: "dark" | "light" | "blue" | "midnight";
  accentColor: string;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  language: string;
  dailyGoal: number;
  weeklyGoal: number;
  showStreak: boolean;
  compactMode: boolean;
  animationsEnabled: boolean;
  autoPlayEnabled: boolean;
  difficultyLevel: "beginner" | "intermediate" | "advanced" | "pro";
  metronomeVolume: number;
  clickSound: string;
}

interface Achievement {
  id: string;
  name: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  total: number;
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: "blue",
  accentColor: "#3b82f6",
  soundEnabled: true,
  notificationsEnabled: true,
  language: "sv",
  dailyGoal: 30,
  weeklyGoal: 5,
  showStreak: true,
  compactMode: false,
  animationsEnabled: true,
  autoPlayEnabled: false,
  difficultyLevel: "intermediate",
  metronomeVolume: 70,
  clickSound: "classic",
};

interface PracticeStats {
  totalMinutes: number;
  todayMinutes: number;
  weeklyMinutes: number[];
  daysActive: number;
  longestStreak: number;
  currentStreak: number;
  lastPracticeDate: string | null;
}

const DEFAULT_PRACTICE_STATS: PracticeStats = {
  totalMinutes: 0,
  todayMinutes: 0,
  weeklyMinutes: [0, 0, 0, 0, 0, 0, 0],
  daysActive: 0,
  longestStreak: 0,
  currentStreak: 0,
  lastPracticeDate: null,
};

const formatMinutes = (min: number) => {
  const rounded = Math.round(min);
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  if (hours <= 0) return `${minutes} min`;
  return `${hours}h ${minutes}m`;
};

const ACHIEVEMENTS: Achievement[] = [
  { id: "first", name: "Första steget", icon: "🎯", unlocked: true, progress: 1, total: 1 },
  { id: "week", name: "Veckostjärna", icon: "⭐", unlocked: true, progress: 7, total: 7 },
  { id: "songs10", name: "10 låtar", icon: "🎵", unlocked: true, progress: 12, total: 10 },
  { id: "songs50", name: "50 låtar", icon: "🎶", unlocked: false, progress: 12, total: 50 },
  { id: "hours10", name: "10 timmar", icon: "⏱️", unlocked: true, progress: 20, total: 10 },
  { id: "hours50", name: "50 timmar", icon: "🏆", unlocked: false, progress: 20, total: 50 },
  { id: "streak30", name: "30 dagars streak", icon: "🔥", unlocked: false, progress: 7, total: 30 },
  { id: "perfect", name: "Perfekt timing", icon: "💎", unlocked: false, progress: 85, total: 100 },
];

const ACCENT_COLORS = [
  { name: "Blå", value: "#3b82f6" },
  { name: "Lila", value: "#8b5cf6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Grön", value: "#10b981" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Orange", value: "#f97316" },
];

const CLICK_SOUNDS = [
  { id: "classic", name: "Klassisk" },
  { id: "wood", name: "Trä" },
  { id: "electronic", name: "Elektronisk" },
  { id: "hihat", name: "Hi-hat" },
  { id: "rim", name: "Rimshot" },
];

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<
    "home" | "practice" | "stats" | "achievements" | "community" | "settings"
  >("home");
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const stored = localStorage.getItem("userSettings");
      if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {}
    return DEFAULT_SETTINGS;
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [lastActive, setLastActive] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const [practiceStats, setPracticeStats] = useState<PracticeStats>(
    DEFAULT_PRACTICE_STATS
  );
  const practiceIntervalRef = useRef<number | null>(null);

  const weeklyData = practiceStats.weeklyMinutes;
  const maxWeekly = Math.max(...weeklyData, 1);

  useEffect(() => {
    localStorage.setItem("userSettings", JSON.stringify(settings));
    document.documentElement.style.setProperty("--accent", settings.accentColor);
  }, [settings]);

  useEffect(() => {
    const fetchUser = async () => {
      const current = await getCurrentUser();
      if (!current) {
        navigate("/login");
        return;
      }
      setUser(current);
      const last = localStorage.getItem(`lastActive_${current.email}`);
      if (last) setLastActive(last);
      localStorage.setItem(`lastActive_${current.email}`, new Date().toLocaleString());
    };
    fetchUser();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    try {
      const stored = localStorage.getItem(`practiceStats_${user.email}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPracticeStats(() => ({
          ...DEFAULT_PRACTICE_STATS,
          ...parsed,
          weeklyMinutes:
            Array.isArray(parsed.weeklyMinutes) && parsed.weeklyMinutes.length === 7
              ? parsed.weeklyMinutes
              : DEFAULT_PRACTICE_STATS.weeklyMinutes,
        }));
      }
    } catch {}
  }, [user]);

  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem(
        `practiceStats_${user.email}`,
        JSON.stringify(practiceStats)
      );
    } catch {}
  }, [practiceStats, user]);

  useEffect(() => {
    socket.on("chatHistory", (history: ChatMessage[]) => setChatMessages(history));
    socket.on("receiveMessage", (msg: ChatMessage) => setChatMessages((prev) => [...prev, msg]));
    return () => {
      socket.off("chatHistory");
      socket.off("receiveMessage");
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Riktig övningstid – räknar minuter när man är på "Träning"-fliken
  useEffect(() => {
    if (!user) return;

    if (activeTab !== "practice") {
      if (practiceIntervalRef.current !== null) {
        window.clearInterval(practiceIntervalRef.current);
        practiceIntervalRef.current = null;
      }
      return;
    }

    let lastTick = Date.now();

    practiceIntervalRef.current = window.setInterval(() => {
      const now = Date.now();
      const diffSeconds = (now - lastTick) / 1000;
      lastTick = now;
      const minutesToAdd = diffSeconds / 60;
      if (minutesToAdd <= 0) return;

      setPracticeStats((prev) => {
        const nowDate = new Date();
        const todayStr = nowDate.toISOString().slice(0, 10);
        const dayIndex = (nowDate.getDay() + 6) % 7; // Mån = 0

        const weeklyMinutes = [...prev.weeklyMinutes];
        weeklyMinutes[dayIndex] =
          (weeklyMinutes[dayIndex] || 0) + minutesToAdd;

        let todayMinutes = prev.todayMinutes;
        let daysActive = prev.daysActive;
        let currentStreak = prev.currentStreak;
        let longestStreak = prev.longestStreak;
        let lastPracticeDate = prev.lastPracticeDate;

        if (prev.lastPracticeDate === todayStr) {
          todayMinutes = prev.todayMinutes + minutesToAdd;
        } else {
          // Ny dag med övning
          todayMinutes = minutesToAdd;
          daysActive = prev.daysActive + 1;

          if (prev.lastPracticeDate) {
            const last = new Date(prev.lastPracticeDate);
            const diffDays = Math.floor(
              (nowDate.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (diffDays === 1) {
              currentStreak = prev.currentStreak + 1;
            } else {
              currentStreak = 1;
            }
          } else {
            currentStreak = 1;
          }

          if (currentStreak > prev.longestStreak) {
            longestStreak = currentStreak;
          }

          lastPracticeDate = todayStr;
        }

        const totalMinutes = prev.totalMinutes + minutesToAdd;

        return {
          totalMinutes,
          todayMinutes,
          weeklyMinutes,
          daysActive,
          longestStreak,
          currentStreak,
          lastPracticeDate,
        };
      });
    }, 5000);

    return () => {
      if (practiceIntervalRef.current !== null) {
        window.clearInterval(practiceIntervalRef.current);
        practiceIntervalRef.current = null;
      }
    };
  }, [activeTab, user]);

  const handleLogout = async () => {
    await logoutUser();
    navigate("/login");
  };

  const sendMessage = () => {
    if (!chatInput.trim() || !user) return;
    const msg: ChatMessage = {
      id: socket.id,
      user: user?.name || user?.email?.split("@")[0] || "Anonym",
      text: chatInput.trim(),
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev, msg]);
    socket.emit("sendMessage", msg);
    setChatInput("");
  };

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (!user) {
    return (
      <div className="dash-loader">
        <div className="dash-loader-ring" />
        <span>Laddar din profil...</span>
      </div>
    );
  }

  const userName = user.name || user.email.split("@")[0];
  const userInitial = userName.charAt(0).toUpperCase();

  const todayMinutesRounded = Math.round(practiceStats.todayMinutes);
  const totalMinutesRounded = Math.round(practiceStats.totalMinutes);
  const dailyProgress =
    settings.dailyGoal > 0
      ? Math.max(
          0,
          Math.min(1, practiceStats.todayMinutes / settings.dailyGoal)
        )
      : 0;
  const totalTimeFormatted = formatMinutes(practiceStats.totalMinutes);

  return (
    <div
      className={`dash dash-theme-${settings.theme}`}
      style={{ "--accent": settings.accentColor } as React.CSSProperties}
    >
      <aside className={`dash-sidebar ${sidebarOpen ? "" : "collapsed"}`}>
        <div className="dash-sidebar-top">
          <div className="dash-brand">
            <div className="dash-brand-icon">🥁</div>
            {sidebarOpen && <span className="dash-brand-name">DrumViz Pro</span>}
          </div>
          <button
            className="dash-sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>

        <nav className="dash-nav">
          {[
            { id: "home", icon: "🏠", label: "Hem" },
            { id: "practice", icon: "🥁", label: "Träning" },
            { id: "stats", icon: "📊", label: "Statistik" },
            { id: "achievements", icon: "🏆", label: "Prestationer" },
            { id: "community", icon: "💬", label: "Community" },
            { id: "settings", icon: "⚙️", label: "Inställningar" },
          ].map((item) => (
            <button
              key={item.id}
              className={`dash-nav-btn ${activeTab === item.id ? "active" : ""}`}
              onClick={() => setActiveTab(item.id as any)}
            >
              <span className="dash-nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="dash-nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="dash-sidebar-bottom">
          <div className="dash-user-card">
            <div className="dash-avatar">{userInitial}</div>
            {sidebarOpen && (
              <div className="dash-user-details">
                <span className="dash-user-name">{userName}</span>
                <span className="dash-user-level">Nivå 12</span>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button className="dash-logout-btn" onClick={handleLogout}>
              Logga ut
            </button>
          )}
        </div>
      </aside>

      <main className="dash-main">
        <header className="dash-header">
          <div className="dash-header-info">
            <h1 className="dash-header-title">
              {activeTab === "home" && "Dashboard"}
              {activeTab === "practice" && "Träningsverktyg"}
              {activeTab === "stats" && "Din statistik"}
              {activeTab === "achievements" && "Dina prestationer"}
              {activeTab === "community" && "Community"}
              {activeTab === "settings" && "Inställningar"}
            </h1>
            <span className="dash-header-date">
              {new Date().toLocaleDateString("sv-SE", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
          </div>
          <div className="dash-header-actions">
            {settings.showStreak && (
              <div className="dash-streak">
                <span className="dash-streak-icon">🔥</span>
                <span className="dash-streak-count">
                  {practiceStats.currentStreak}
                </span>
              </div>
            )}
            <div className="dash-xp-bar">
              <div className="dash-xp-fill" style={{ width: "65%" }} />
              <span className="dash-xp-text">650 / 1000 XP</span>
            </div>
          </div>
        </header>

        <div className="dash-content">
          {activeTab === "home" && (
            <>
              <section className="dash-welcome">
                <div className="dash-welcome-left">
                  <h2>Välkommen tillbaka, {userName}!</h2>
                  <p>Du har övat {todayMinutesRounded} minuter idag. Fortsätt så!</p>
                  <div className="dash-progress-ring">
                    <svg viewBox="0 0 100 100">
                      <circle
                        className="dash-ring-bg"
                        cx="50"
                        cy="50"
                        r="45"
                      />
                      <circle
                        className="dash-ring-fill"
                        cx="50"
                        cy="50"
                        r="45"
                        strokeDasharray={`${dailyProgress * 283} 283`}
                      />
                    </svg>
                    <div className="dash-ring-text">
                      <span className="dash-ring-val">{todayMinutesRounded}</span>
                      <span className="dash-ring-label">min</span>
                    </div>
                  </div>
                </div>
                <div className="dash-quick-stats">
                  <div className="dash-qstat">
                    <span className="dash-qstat-icon">⏱️</span>
                    <div className="dash-qstat-info">
                      <span className="dash-qstat-val">
                        {totalMinutesRounded.toLocaleString("sv-SE")}
                      </span>
                      <span className="dash-qstat-lbl">Totala minuter</span>
                    </div>
                  </div>
                  <div className="dash-qstat">
                    <span className="dash-qstat-icon">🎵</span>
                    <div className="dash-qstat-info">
                      <span className="dash-qstat-val">12</span>
                      <span className="dash-qstat-lbl">Låtar klarade</span>
                    </div>
                  </div>
                  <div className="dash-qstat">
                    <span className="dash-qstat-icon">🎯</span>
                    <div className="dash-qstat-info">
                      <span className="dash-qstat-val">87%</span>
                      <span className="dash-qstat-lbl">Genomsnitt precision</span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="dash-tools-section">
                <h3 className="dash-section-title">Börja träna</h3>
                <div className="dash-tools-grid">
                  <div
                    className="dash-tool-card featured"
                    onClick={() => navigate("/drums")}
                  >
                    <div className="dash-tool-glow" />
                    <div className="dash-tool-header">
                      <span className="dash-tool-icon">🥁</span>
                      <span className="dash-tool-badge">Populär</span>
                    </div>
                    <h4>Drum Visualizer</h4>
                    <p>
                      Spela till dina favoritlåtar med realtids-feedback och
                      noter
                    </p>
                    <button className="dash-tool-btn">Starta</button>
                  </div>

                  {/* 🆕 Online Battle-kort */}
                  <div
                    className="dash-tool-card"
                    onClick={() => navigate("/versus-online")}
                  >
                    <span className="dash-tool-icon">⚔️</span>
                    <h4>Online Battle</h4>
                    <p>
                      Tävla mot andra spelare (eller bot) och se vem som får mest
                      poäng
                    </p>
                    <button className="dash-tool-btn">Starta</button>
                  </div>

                  <div
                    className="dash-tool-card"
                    onClick={() => navigate("/timing-trainer")}
                  >
                    <span className="dash-tool-icon">⏱️</span>
                    <h4>Timing Trainer</h4>
                    <p>Professionell metronom med 20+ presets</p>
                    <button className="dash-tool-btn">Starta</button>
                  </div>

                  <div
                    className="dash-tool-card"
                    onClick={() => navigate("/free-drums")}
                  >
                    <span className="dash-tool-icon">🎹</span>
                    <h4>Fritt Trumset</h4>
                    <p>Jamma fritt på virtuellt kit</p>
                    <button className="dash-tool-btn">Starta</button>
                  </div>

                  <div
                    className="dash-tool-card"
                    onClick={() => navigate("/coordination-trainer")}
                  >
                    <span className="dash-tool-icon">🤝</span>
                    <h4>Koordination</h4>
                    <p>Träna grooves steg för steg</p>
                    <button className="dash-tool-btn">Starta</button>
                  </div>

                  <div
                    className="dash-tool-card"
                    onClick={() => navigate("/learn-drums")}
                  >
                    <span className="dash-tool-icon">📚</span>
                    <h4>Lär dig spela</h4>
                    <p>Kurser för nybörjare</p>
                    <button className="dash-tool-btn">Starta</button>
                  </div>

                  <div
                    className="dash-tool-card"
                    onClick={() => navigate("/learn-notation")}
                  >
                    <span className="dash-tool-icon">🎼</span>
                    <h4>Lär dig noter</h4>
                    <p>Läs och förstå trumnoter</p>
                    <button className="dash-tool-btn">Starta</button>
                  </div>

                  {/* 🆕 Piano Visualizer-kort */}
                  <div
                    className="dash-tool-card"
                    onClick={() => navigate("/piano-visualizer")}
                  >
                    <span className="dash-tool-icon">🎹</span>
                    <h4>Piano Visualizer</h4>
                    <p>Spela piano med fallande noter och feedback</p>
                    <button className="dash-tool-btn">Starta</button>
                  </div>
                </div>
              </section>

              <section className="dash-week-section">
                <h3 className="dash-section-title">Veckoöversikt</h3>
                <div className="dash-week-chart">
                  {["Mån", "Tis", "Ons", "Tors", "Fre", "Lör", "Sön"].map(
                    (day, i) => (
                      <div key={day} className="dash-week-bar">
                        <div
                          className="dash-bar-fill"
                          style={{
                            height: `${
                              maxWeekly > 0
                                ? (weeklyData[i] / maxWeekly) * 100
                                : 0
                            }%`,
                          }}
                        >
                          <span className="dash-bar-val">
                            {Math.round(weeklyData[i])}
                          </span>
                        </div>
                        <span className="dash-bar-day">{day}</span>
                      </div>
                    )
                  )}
                </div>
              </section>
            </>
          )}

          {activeTab === "practice" && (
            <section className="dash-practice-section">
              <div className="dash-practice-grid">
                {[
                  {
                    icon: "🥁",
                    title: "Drum Visualizer",
                    desc: "Spela till låtar med visuell feedback",
                    path: "/drums",
                    featured: true,
                  },
                  {
                    icon: "⚔️",
                    title: "Online Battle",
                    desc: "Tävla mot spelare eller bot i realtid",
                    path: "/versus-online",
                  },
                  {
                    icon: "⏱️",
                    title: "Timing Trainer",
                    desc: "Metronom med speed trainer och precision mode",
                    path: "/timing-trainer",
                  },
                  {
                    icon: "🎹",
                    title: "Fritt Trumset",
                    desc: "Virtuellt trumset - jamma fritt",
                    path: "/free-drums",
                  },
                  {
                    icon: "🤝",
                    title: "Koordination",
                    desc: "Lär dig grooves steg för steg",
                    path: "/coordination-trainer",
                  },
                  {
                    icon: "📚",
                    title: "Lär dig spela",
                    desc: "Grundkurser i trumspel",
                    path: "/learn-drums",
                  },
                  {
                    icon: "🎼",
                    title: "Lär dig noter",
                    desc: "Läs och förstå trumnoter",
                    path: "/learn-notation",
                  },
                  {
                    icon: "🎯",
                    title: "Precision Mode",
                    desc: "Testa din timing-precision",
                    path: "/timing-trainer",
                  },
                  {
                    icon: "🔥",
                    title: "Daglig utmaning",
                    desc: "Nya utmaningar varje dag",
                    path: "/drums",
                  },
                  {
                    icon: "🎵",
                    title: "Låtbibliotek",
                    desc: "Bläddra bland alla låtar",
                    path: "/drums",
                  },
                  {
                    icon: "🎹",
                    title: "Piano Visualizer",
                    desc: "Spela piano med visuell feedback",
                    path: "/piano-visualizer",
                  },
                ].map((tool) => (
                  <div
                    key={tool.title}
                    className={`dash-practice-card ${
                      tool.featured ? "featured" : ""
                    }`}
                    onClick={() => navigate(tool.path)}
                  >
                    {tool.featured && <div className="dash-card-glow" />}
                    <span className="dash-practice-icon">{tool.icon}</span>
                    <h4>{tool.title}</h4>
                    <p>{tool.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === "stats" && (
            <section className="dash-stats-section">
              <div className="dash-stats-overview">
                {[
                  { icon: "⏱️", label: "Total tid", value: totalTimeFormatted },
                  { icon: "🎵", label: "Låtar spelade", value: "47" },
                  {
                    icon: "🔥",
                    label: "Längsta streak",
                    value: `${practiceStats.longestStreak} dagar`,
                  },
                  { icon: "🎯", label: "Bästa precision", value: "98%" },
                  {
                    icon: "📅",
                    label: "Dagar aktiv",
                    value: practiceStats.daysActive.toString(),
                  },
                  { icon: "🏆", label: "Prestationer", value: "8/24" },
                ].map((stat) => (
                  <div key={stat.label} className="dash-stat-box">
                    <span className="dash-stat-icon">{stat.icon}</span>
                    <span className="dash-stat-value">{stat.value}</span>
                    <span className="dash-stat-label">{stat.label}</span>
                  </div>
                ))}
              </div>

              <div className="dash-stats-charts">
                <div className="dash-chart-card">
                  <h4>Övningstid per vecka</h4>
                  <div className="dash-line-chart">
                    {weeklyData.map((val, i) => (
                      <div
                        key={i}
                        className="dash-line-point"
                        style={{
                          left: `${i * 16.66}%`,
                          bottom: `${
                            maxWeekly > 0 ? (val / maxWeekly) * 80 : 0
                          }%`,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="dash-chart-card">
                  <h4>Precision över tid</h4>
                  <div className="dash-precision-chart">
                    <div className="dash-prec-bar" style={{ width: "75%" }}>
                      <span>Förra veckan: 75%</span>
                    </div>
                    <div
                      className="dash-prec-bar current"
                      style={{ width: "87%" }}
                    >
                      <span>Denna vecka: 87%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="dash-recent-activity">
                <h4>Senaste aktivitet</h4>
                <div className="dash-activity-list">
                  {[
                    {
                      time: "Idag 14:30",
                      action: "Spelade Crazy Train",
                      score: "92%",
                    },
                    {
                      time: "Idag 10:15",
                      action: "Timing Trainer - 15 min",
                      score: "88%",
                    },
                    {
                      time: "Igår 18:45",
                      action: "Koordinationsövning",
                      score: "85%",
                    },
                    {
                      time: "Igår 12:00",
                      action: "Spelade Back in Black",
                      score: "94%",
                    },
                  ].map((activity, i) => (
                    <div key={i} className="dash-activity-item">
                      <span className="dash-activity-time">
                        {activity.time}
                      </span>
                      <span className="dash-activity-action">
                        {activity.action}
                      </span>
                      <span className="dash-activity-score">
                        {activity.score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeTab === "achievements" && (
            <section className="dash-achievements-section">
              <div className="dash-achievements-header">
                <div className="dash-ach-summary">
                  <span className="dash-ach-count">4/8</span>
                  <span className="dash-ach-label">
                    Prestationer upplåsta
                  </span>
                </div>
                <div className="dash-ach-xp">
                  <span>+400 XP förtjänat</span>
                </div>
              </div>

              <div className="dash-achievements-grid">
                {ACHIEVEMENTS.map((ach) => (
                  <div
                    key={ach.id}
                    className={`dash-ach-card ${
                      ach.unlocked ? "unlocked" : "locked"
                    }`}
                  >
                    <span className="dash-ach-icon">{ach.icon}</span>
                    <h4>{ach.name}</h4>
                    <div className="dash-ach-progress">
                      <div className="dash-ach-bar">
                        <div
                          className="dash-ach-fill"
                          style={{
                            width: `${Math.min(
                              100,
                              (ach.progress / ach.total) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="dash-ach-nums">
                        {ach.progress}/{ach.total}
                      </span>
                    </div>
                    {ach.unlocked && (
                      <span className="dash-ach-badge">Upplåst!</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === "community" && (
            <section className="dash-community-section">
              <div className="dash-chat-panel">
                <div className="dash-chat-header">
                  <h3>Allmän Chat</h3>
                  <span className="dash-online-count">12 online</span>
                </div>
                <div className="dash-chat-messages">
                  {chatMessages.length === 0 && (
                    <p className="dash-chat-empty">
                      Inga meddelanden ännu. Var först att skriva!
                    </p>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`dash-chat-msg ${
                        msg.id === socket.id ? "me" : ""
                      }`}
                    >
                      <div className="dash-msg-avatar">
                        {msg.user.charAt(0).toUpperCase()}
                      </div>
                      <div className="dash-msg-content">
                        <div className="dash-msg-header">
                          <span className="dash-msg-user">
                            {msg.id === socket.id ? "Du" : msg.user}
                          </span>
                          <span className="dash-msg-time">
                            {new Date(msg.timestamp).toLocaleTimeString(
                              "sv-SE",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        </div>
                        <p className="dash-msg-text">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="dash-chat-input">
                  <input
                    type="text"
                    placeholder="Skriv ett meddelande..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  />
                  <button onClick={sendMessage}>Skicka</button>
                </div>
              </div>

              <div className="dash-leaderboard">
                <h3>Topplista denna vecka</h3>
                <div className="dash-leaders">
                  {[
                    {
                      rank: 1,
                      name: "DrumMaster99",
                      xp: 2450,
                      avatar: "D",
                    },
                    { rank: 2, name: "BeatKing", xp: 2180, avatar: "B" },
                    {
                      rank: 3,
                      name: "RhythmQueen",
                      xp: 1950,
                      avatar: "R",
                    },
                    {
                      rank: 4,
                      name: userName,
                      xp: 1650,
                      avatar: userInitial,
                    },
                    {
                      rank: 5,
                      name: "StickWizard",
                      xp: 1420,
                      avatar: "S",
                    },
                  ].map((player) => (
                    <div
                      key={player.rank}
                      className={`dash-leader-row ${
                        player.name === userName ? "me" : ""
                      }`}
                    >
                      <span className="dash-leader-rank">
                        #{player.rank}
                      </span>
                      <span className="dash-leader-avatar">
                        {player.avatar}
                      </span>
                      <span className="dash-leader-name">
                        {player.name}
                      </span>
                      <span className="dash-leader-xp">
                        {player.xp} XP
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeTab === "settings" && (
            <section className="dash-settings-section">
              <div className="dash-settings-group">
                <h3>Utseende</h3>
                <div className="dash-setting-row">
                  <label>Tema</label>
                  <div className="dash-theme-options">
                    {[
                      { id: "dark", label: "Mörkt" },
                      { id: "light", label: "Ljust" },
                      { id: "blue", label: "Blått" },
                      { id: "midnight", label: "Midnatt" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        className={`dash-theme-btn ${
                          settings.theme === t.id ? "active" : ""
                        }`}
                        onClick={() => updateSetting("theme", t.id as any)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="dash-setting-row">
                  <label>Accentfärg</label>
                  <div className="dash-color-options">
                    {ACCENT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        className={`dash-color-btn ${
                          settings.accentColor === color.value
                            ? "active"
                            : ""
                        }`}
                        style={{ background: color.value }}
                        onClick={() =>
                          updateSetting("accentColor", color.value)
                        }
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="dash-setting-row">
                  <label>Animationer</label>
                  <label className="dash-switch">
                    <input
                      type="checkbox"
                      checked={settings.animationsEnabled}
                      onChange={(e) =>
                        updateSetting(
                          "animationsEnabled",
                          e.target.checked
                        )
                      }
                    />
                    <span className="dash-switch-slider" />
                  </label>
                </div>

                <div className="dash-setting-row">
                  <label>Kompakt läge</label>
                  <label className="dash-switch">
                    <input
                      type="checkbox"
                      checked={settings.compactMode}
                      onChange={(e) =>
                        updateSetting(
                          "compactMode",
                          e.target.checked
                        )
                      }
                    />
                    <span className="dash-switch-slider" />
                  </label>
                </div>
              </div>

              <div className="dash-settings-group">
                <h3>Ljud</h3>
                <div className="dash-setting-row">
                  <label>Ljud aktiverat</label>
                  <label className="dash-switch">
                    <input
                      type="checkbox"
                      checked={settings.soundEnabled}
                      onChange={(e) =>
                        updateSetting("soundEnabled", e.target.checked)
                      }
                    />
                    <span className="dash-switch-slider" />
                  </label>
                </div>

                <div className="dash-setting-row">
                  <label>
                    Metronomvolym: {settings.metronomeVolume}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.metronomeVolume}
                    onChange={(e) =>
                      updateSetting(
                        "metronomeVolume",
                        Number(e.target.value)
                      )
                    }
                    className="dash-range"
                  />
                </div>

                <div className="dash-setting-row">
                  <label>Klickljud</label>
                  <select
                    value={settings.clickSound}
                    onChange={(e) =>
                      updateSetting("clickSound", e.target.value)
                    }
                    className="dash-select"
                  >
                    {CLICK_SOUNDS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="dash-settings-group">
                <h3>Träning</h3>
                <div className="dash-setting-row">
                  <label>
                    Dagligt mål (minuter): {settings.dailyGoal}
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="120"
                    step="5"
                    value={settings.dailyGoal}
                    onChange={(e) =>
                      updateSetting(
                        "dailyGoal",
                        Number(e.target.value)
                      )
                    }
                    className="dash-range"
                  />
                </div>

                <div className="dash-setting-row">
                  <label>
                    Veckomål (låtar): {settings.weeklyGoal}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={settings.weeklyGoal}
                    onChange={(e) =>
                      updateSetting(
                        "weeklyGoal",
                        Number(e.target.value)
                      )
                    }
                    className="dash-range"
                  />
                </div>

                <div className="dash-setting-row">
                  <label>Svårighetsgrad</label>
                  <select
                    value={settings.difficultyLevel}
                    onChange={(e) =>
                      updateSetting(
                        "difficultyLevel",
                        e.target.value as any
                      )
                    }
                    className="dash-select"
                  >
                    <option value="beginner">Nybörjare</option>
                    <option value="intermediate">Medel</option>
                    <option value="advanced">Avancerad</option>
                    <option value="pro">Proffs</option>
                  </select>
                </div>

                <div className="dash-setting-row">
                  <label>Visa streak</label>
                  <label className="dash-switch">
                    <input
                      type="checkbox"
                      checked={settings.showStreak}
                      onChange={(e) =>
                        updateSetting(
                          "showStreak",
                          e.target.checked
                        )
                      }
                    />
                    <span className="dash-switch-slider" />
                  </label>
                </div>

                <div className="dash-setting-row">
                  <label>Auto-play nästa låt</label>
                  <label className="dash-switch">
                    <input
                      type="checkbox"
                      checked={settings.autoPlayEnabled}
                      onChange={(e) =>
                        updateSetting(
                          "autoPlayEnabled",
                          e.target.checked
                        )
                      }
                    />
                    <span className="dash-switch-slider" />
                  </label>
                </div>
              </div>

              <div className="dash-settings-group">
                <h3>Notifikationer</h3>
                <div className="dash-setting-row">
                  <label>Push-notifikationer</label>
                  <label className="dash-switch">
                    <input
                      type="checkbox"
                      checked={settings.notificationsEnabled}
                      onChange={(e) =>
                        updateSetting(
                          "notificationsEnabled",
                          e.target.checked
                        )
                      }
                    />
                    <span className="dash-switch-slider" />
                  </label>
                </div>
              </div>

              <div className="dash-settings-group">
                <h3>Konto</h3>
                <div className="dash-account-info">
                  <div className="dash-account-avatar">
                    {userInitial}
                  </div>
                  <div className="dash-account-details">
                    <span className="dash-account-name">
                      {userName}
                    </span>
                    <span className="dash-account-email">
                      {user.email}
                    </span>
                    <span className="dash-account-joined">
                      Medlem sedan: {lastActive || "Idag"}
                    </span>
                  </div>
                </div>
                <button
                  className="dash-danger-btn"
                  onClick={handleLogout}
                >
                  Logga ut
                </button>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
