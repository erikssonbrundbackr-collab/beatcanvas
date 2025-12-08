import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./LearnNotation.css";

interface DrumNote {
  id: string;
  name: string;
  symbol: string;
  position: string;
  color: string;
  sound: string;
}

interface NotationLevel {
  id: number;
  title: string;
  description: string;
  icon: string;
  color: string;
  drumFocus: string[];
  lessons: NotationLesson[];
}

interface NotationLesson {
  id: number;
  title: string;
  description: string;
  type: "intro" | "learn" | "practice" | "quiz";
  xp: number;
  completed: boolean;
  drums?: string[];
}

const DRUM_NOTES: DrumNote[] = [
  { id: "kick", name: "Bastrumma", symbol: "●", position: "Längst ner", color: "#ef4444", sound: "BOOM" },
  { id: "snare", name: "Virveltrumma", symbol: "●", position: "Mitten", color: "#3b82f6", sound: "CRACK" },
  { id: "hihat", name: "Hi-Hat", symbol: "×", position: "Överst", color: "#22c55e", sound: "TSS" },
  { id: "crash", name: "Crash", symbol: "✕", position: "Ovanför", color: "#f59e0b", sound: "CRASH" },
  { id: "ride", name: "Ride", symbol: "○", position: "Höger uppe", color: "#8b5cf6", sound: "DING" },
  { id: "tom1", name: "Tom 1", symbol: "●", position: "Övre mitten", color: "#ec4899", sound: "TOM" },
  { id: "tom2", name: "Tom 2", symbol: "●", position: "Nedre mitten", color: "#06b6d4", sound: "TUM" },
  { id: "floor", name: "Golvpuka", symbol: "●", position: "Längst ner höger", color: "#84cc16", sound: "THUM" },
];

const NOTATION_LEVELS: NotationLevel[] = [
  // === GRUNDNIVÅER (1-5): En trumma i taget ===
  {
    id: 1,
    title: "Hi-Hat Intro",
    description: "Din första trumma - Hi-Hat",
    icon: "🥁",
    color: "#22c55e",
    drumFocus: ["hihat"],
    lessons: [
      { id: 1, title: "Välkommen!", description: "Vad är trumnoter?", type: "intro", xp: 10, completed: false },
      { id: 2, title: "Möt Hi-Hat", description: "Se noten, slå Hi-Hat", type: "learn", xp: 15, completed: false, drums: ["hihat"] },
      { id: 3, title: "Hitta Hi-Hat", description: "Klicka när du ser Hi-Hat", type: "practice", xp: 20, completed: false, drums: ["hihat"] },
    ]
  },
  {
    id: 2,
    title: "Kick Drum",
    description: "Lär känna bastrumman",
    icon: "💥",
    color: "#ef4444",
    drumFocus: ["kick"],
    lessons: [
      { id: 1, title: "Möt Kick", description: "Bastrummans not", type: "learn", xp: 15, completed: false, drums: ["kick"] },
      { id: 2, title: "Hitta Kick", description: "Identifiera bastrumman", type: "practice", xp: 20, completed: false, drums: ["kick"] },
      { id: 3, title: "Hi-Hat eller Kick?", description: "Känner du skillnad?", type: "quiz", xp: 25, completed: false, drums: ["hihat", "kick"] },
    ]
  },
  {
    id: 3,
    title: "Snare Drum",
    description: "Virveltrummans not",
    icon: "🔵",
    color: "#3b82f6",
    drumFocus: ["snare"],
    lessons: [
      { id: 1, title: "Möt Snare", description: "Virveltrummans position", type: "learn", xp: 15, completed: false, drums: ["snare"] },
      { id: 2, title: "Hitta Snare", description: "Identifiera snare", type: "practice", xp: 20, completed: false, drums: ["snare"] },
      { id: 3, title: "Tre trummor", description: "Hi-Hat, Kick eller Snare?", type: "quiz", xp: 30, completed: false, drums: ["hihat", "kick", "snare"] },
    ]
  },
  {
    id: 4,
    title: "Kombinera 3",
    description: "Hi-Hat + Kick + Snare",
    icon: "🎯",
    color: "#8b5cf6",
    drumFocus: ["hihat", "kick", "snare"],
    lessons: [
      { id: 1, title: "Snabbrepetition", description: "Repetera alla tre", type: "learn", xp: 20, completed: false, drums: ["hihat", "kick", "snare"] },
      { id: 2, title: "Blandad övning", description: "Alla tre trummor", type: "practice", xp: 25, completed: false, drums: ["hihat", "kick", "snare"] },
      { id: 3, title: "Test: Bas-tre", description: "Visa vad du kan!", type: "quiz", xp: 35, completed: false, drums: ["hihat", "kick", "snare"] },
    ]
  },
  {
    id: 5,
    title: "Crash Cymbal",
    description: "Den stora cymbalen",
    icon: "💫",
    color: "#f59e0b",
    drumFocus: ["crash"],
    lessons: [
      { id: 1, title: "Möt Crash", description: "Crashens position", type: "learn", xp: 15, completed: false, drums: ["crash"] },
      { id: 2, title: "Hitta Crash", description: "Se skillnad på cymbaler", type: "practice", xp: 20, completed: false, drums: ["hihat", "crash"] },
      { id: 3, title: "4 trummor", description: "Lägg till crash!", type: "quiz", xp: 30, completed: false, drums: ["hihat", "kick", "snare", "crash"] },
    ]
  },
  // === MELLANIVÅER (6-10): Fler trummor ===
  {
    id: 6,
    title: "Ride Cymbal",
    description: "Den lugna cymbalen",
    icon: "🔔",
    color: "#8b5cf6",
    drumFocus: ["ride"],
    lessons: [
      { id: 1, title: "Möt Ride", description: "Ride vs Hi-Hat", type: "learn", xp: 15, completed: false, drums: ["ride"] },
      { id: 2, title: "Cymbaler", description: "Alla tre cymbaler", type: "practice", xp: 25, completed: false, drums: ["hihat", "crash", "ride"] },
      { id: 3, title: "5 trummor", description: "Nu kan du fem!", type: "quiz", xp: 35, completed: false, drums: ["hihat", "kick", "snare", "crash", "ride"] },
    ]
  },
  {
    id: 7,
    title: "Tom 1 (High)",
    description: "Första pukan",
    icon: "🩷",
    color: "#ec4899",
    drumFocus: ["tom1"],
    lessons: [
      { id: 1, title: "Möt Tom 1", description: "Den höga pukan", type: "learn", xp: 15, completed: false, drums: ["tom1"] },
      { id: 2, title: "Hitta Tom 1", description: "Tom vs Snare", type: "practice", xp: 25, completed: false, drums: ["snare", "tom1"] },
      { id: 3, title: "6 trummor", description: "Sex i setet!", type: "quiz", xp: 40, completed: false, drums: ["hihat", "kick", "snare", "crash", "ride", "tom1"] },
    ]
  },
  {
    id: 8,
    title: "Tom 2 (Low)",
    description: "Andra pukan",
    icon: "🩵",
    color: "#06b6d4",
    drumFocus: ["tom2"],
    lessons: [
      { id: 1, title: "Möt Tom 2", description: "Den låga pukan", type: "learn", xp: 15, completed: false, drums: ["tom2"] },
      { id: 2, title: "Alla pukor", description: "Tom 1 vs Tom 2", type: "practice", xp: 25, completed: false, drums: ["tom1", "tom2"] },
      { id: 3, title: "7 trummor", description: "Nästan hela setet!", type: "quiz", xp: 45, completed: false, drums: ["hihat", "kick", "snare", "crash", "ride", "tom1", "tom2"] },
    ]
  },
  {
    id: 9,
    title: "Floor Tom",
    description: "Golvpukan - sista pjäsen!",
    icon: "💚",
    color: "#84cc16",
    drumFocus: ["floor"],
    lessons: [
      { id: 1, title: "Möt Golvpukan", description: "Den stora pukan", type: "learn", xp: 15, completed: false, drums: ["floor"] },
      { id: 2, title: "Alla pukor", description: "Tom 1, 2 och Floor", type: "practice", xp: 30, completed: false, drums: ["tom1", "tom2", "floor"] },
      { id: 3, title: "Hela setet!", description: "Nu kan du alla 8!", type: "quiz", xp: 50, completed: false, drums: ["hihat", "kick", "snare", "crash", "ride", "tom1", "tom2", "floor"] },
    ]
  },
  {
    id: 10,
    title: "Mästartest 1",
    description: "Kan du alla trummor?",
    icon: "🏆",
    color: "#fbbf24",
    drumFocus: ["hihat", "kick", "snare", "crash", "ride", "tom1", "tom2", "floor"],
    lessons: [
      { id: 1, title: "Snabbrepetition", description: "Alla 8 trummor", type: "learn", xp: 25, completed: false, drums: ["hihat", "kick", "snare", "crash", "ride", "tom1", "tom2", "floor"] },
      { id: 2, title: "Intensiv övning", description: "Blandade noter", type: "practice", xp: 40, completed: false, drums: ["hihat", "kick", "snare", "crash", "ride", "tom1", "tom2", "floor"] },
      { id: 3, title: "MÄSTARTEST", description: "Bevisa dina kunskaper!", type: "quiz", xp: 75, completed: false, drums: ["hihat", "kick", "snare", "crash", "ride", "tom1", "tom2", "floor"] },
    ]
  },
  // === AVANCERAT (11-15): Snabbhet och mönster ===
  {
    id: 11,
    title: "Snabb Kick+Snare",
    description: "Fokus på grunderna snabbt",
    icon: "⚡",
    color: "#ef4444",
    drumFocus: ["kick", "snare"],
    lessons: [
      { id: 1, title: "Snabb intro", description: "Kick och Snare snabbt", type: "learn", xp: 20, completed: false, drums: ["kick", "snare"] },
      { id: 2, title: "Snabbövning", description: "10 noter snabbt!", type: "practice", xp: 35, completed: false, drums: ["kick", "snare"] },
      { id: 3, title: "Speed-test", description: "Hur snabb är du?", type: "quiz", xp: 50, completed: false, drums: ["kick", "snare"] },
    ]
  },
  {
    id: 12,
    title: "Cymbaljakt",
    description: "Alla cymbaler snabbt",
    icon: "🔔",
    color: "#22c55e",
    drumFocus: ["hihat", "crash", "ride"],
    lessons: [
      { id: 1, title: "Cymbalöversikt", description: "Tre cymbaler", type: "learn", xp: 20, completed: false, drums: ["hihat", "crash", "ride"] },
      { id: 2, title: "Cymbalövning", description: "Hitta rätt cymbal", type: "practice", xp: 35, completed: false, drums: ["hihat", "crash", "ride"] },
      { id: 3, title: "Cymbaltest", description: "Snabb igenkänning", type: "quiz", xp: 50, completed: false, drums: ["hihat", "crash", "ride"] },
    ]
  },
  {
    id: 13,
    title: "Tom-Fills",
    description: "Alla pukor tillsammans",
    icon: "🥁",
    color: "#ec4899",
    drumFocus: ["tom1", "tom2", "floor"],
    lessons: [
      { id: 1, title: "Fill-intro", description: "Pukor för fills", type: "learn", xp: 20, completed: false, drums: ["tom1", "tom2", "floor"] },
      { id: 2, title: "Fill-övning", description: "Puka-sekvenser", type: "practice", xp: 40, completed: false, drums: ["tom1", "tom2", "floor"] },
      { id: 3, title: "Fill-test", description: "Snabba fills!", type: "quiz", xp: 55, completed: false, drums: ["tom1", "tom2", "floor"] },
    ]
  },
  {
    id: 14,
    title: "Blandat Kaos",
    description: "Alla trummor, snabbt tempo",
    icon: "🌀",
    color: "#8b5cf6",
    drumFocus: ["hihat", "kick", "snare", "crash", "ride", "tom1", "tom2", "floor"],
    lessons: [
      { id: 1, title: "Kaos-intro", description: "Alla trummor blandade", type: "learn", xp: 25, completed: false, drums: ["hihat", "kick", "snare", "crash", "ride", "tom1", "tom2", "floor"] },
      { id: 2, title: "Kaos-övning", description: "15 noter!", type: "practice", xp: 50, completed: false, drums: ["hihat", "kick", "snare", "crash", "ride", "tom1", "tom2", "floor"] },
      { id: 3, title: "Kaos-test", description: "20 noter snabbt!", type: "quiz", xp: 70, completed: false, drums: ["hihat", "kick", "snare", "crash", "ride", "tom1", "tom2", "floor"] },
    ]
  },
  {
    id: 15,
    title: "SLUTTEST",
    description: "Det ultimata testet!",
    icon: "👑",
    color: "#fbbf24",
    drumFocus: ["hihat", "kick", "snare", "crash", "ride", "tom1", "tom2", "floor"],
    lessons: [
      { id: 1, title: "Sista repetition", description: "Allt du lärt dig", type: "learn", xp: 30, completed: false, drums: ["hihat", "kick", "snare", "crash", "ride", "tom1", "tom2", "floor"] },
      { id: 2, title: "Intensiv träning", description: "25 noter!", type: "practice", xp: 60, completed: false, drums: ["hihat", "kick", "snare", "crash", "ride", "tom1", "tom2", "floor"] },
      { id: 3, title: "MÄSTAREN", description: "30 noter - klarar du det?", type: "quiz", xp: 100, completed: false, drums: ["hihat", "kick", "snare", "crash", "ride", "tom1", "tom2", "floor"] },
    ]
  },
];

const STORAGE_KEY = "notation_progress_v2";

export default function LearnNotation() {
  const navigate = useNavigate();
  const [view, setView] = useState<"home" | "level" | "lesson">("home");
  const [levels, setLevels] = useState<NotationLevel[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        return NOTATION_LEVELS.map((level, idx) => {
          const savedLevel = data.levels?.find((l: any) => l.id === level.id);
          return {
            ...level,
            lessons: level.lessons.map(lesson => {
              const savedLesson = savedLevel?.lessons?.find((sl: any) => sl.id === lesson.id);
              return savedLesson ? { ...lesson, completed: savedLesson.completed } : lesson;
            })
          };
        });
      }
    } catch {}
    return NOTATION_LEVELS;
  });
  const [currentLevel, setCurrentLevel] = useState<NotationLevel | null>(null);
  const [currentLesson, setCurrentLesson] = useState<NotationLesson | null>(null);
  const [lessonStep, setLessonStep] = useState(0);
  const [totalXp, setTotalXp] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).totalXp || 0;
    } catch {}
    return 0;
  });
  
  // Practice/Quiz state
  const [currentDrum, setCurrentDrum] = useState<DrumNote | null>(null);
  const [selectedDrum, setSelectedDrum] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  // Success overlay
  const [showSuccess, setShowSuccess] = useState(false);
  const [earnedXp, setEarnedXp] = useState(0);

  // Check if level is unlocked
  const isLevelUnlocked = useCallback((levelId: number) => {
    if (levelId === 1) return true;
    const prevLevel = levels.find(l => l.id === levelId - 1);
    if (!prevLevel) return false;
    return prevLevel.lessons.every(l => l.completed);
  }, [levels]);

  // Save progress
  const saveProgress = useCallback((newLevels: NotationLevel[], newXp: number) => {
    try {
      const data = {
        totalXp: newXp,
        levels: newLevels.map(l => ({
          id: l.id,
          lessons: l.lessons.map(les => ({ id: les.id, completed: les.completed }))
        }))
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, []);

  const selectLevel = (level: NotationLevel) => {
    if (!isLevelUnlocked(level.id)) return;
    setCurrentLevel(level);
    setView("level");
  };

  const startLesson = (lesson: NotationLesson) => {
    setCurrentLesson(lesson);
    setLessonStep(0);
    setCorrectCount(0);
    setQuestionNumber(0);
    setSelectedDrum(null);
    setShowFeedback(false);
    
    // Set total questions based on lesson type and level
    const baseQuestions = lesson.type === "quiz" ? 10 : 5;
    const levelBonus = Math.min(Math.floor((currentLevel?.id || 1) / 3), 5);
    setTotalQuestions(baseQuestions + levelBonus);
    
    if (lesson.type === "practice" || lesson.type === "quiz") {
      generateNewQuestion(lesson.drums || []);
    }
    
    setView("lesson");
  };

  const generateNewQuestion = (availableDrums: string[]) => {
    const drums = DRUM_NOTES.filter(d => availableDrums.includes(d.id));
    if (drums.length === 0) return;
    const randomDrum = drums[Math.floor(Math.random() * drums.length)];
    setCurrentDrum(randomDrum);
    setSelectedDrum(null);
    setShowFeedback(false);
  };

  const handleDrumSelect = (drumId: string) => {
    if (showFeedback || !currentDrum || !currentLesson) return;
    
    setSelectedDrum(drumId);
    const correct = drumId === currentDrum.id;
    setIsCorrect(correct);
    setShowFeedback(true);
    
    if (correct) {
      setCorrectCount(prev => prev + 1);
    }
    
    setTimeout(() => {
      const newQ = questionNumber + 1;
      setQuestionNumber(newQ);
      
      if (newQ >= totalQuestions) {
        // Check if passed (60% for quiz, 50% for practice)
        const threshold = currentLesson.type === "quiz" ? 0.6 : 0.5;
        const newCorrect = correct ? correctCount + 1 : correctCount;
        if (newCorrect / totalQuestions >= threshold) {
          completeLesson();
        } else {
          // Reset for retry
          setQuestionNumber(0);
          setCorrectCount(0);
          generateNewQuestion(currentLesson.drums || []);
        }
      } else {
        generateNewQuestion(currentLesson.drums || []);
      }
    }, 1000);
  };

  const completeLesson = () => {
    if (!currentLesson || !currentLevel) return;
    
    const xpGain = currentLesson.xp;
    setEarnedXp(xpGain);
    
    const newLevels = levels.map(level => {
      if (level.id === currentLevel.id) {
        return {
          ...level,
          lessons: level.lessons.map(les => 
            les.id === currentLesson.id ? { ...les, completed: true } : les
          )
        };
      }
      return level;
    });
    
    const newXp = totalXp + xpGain;
    setLevels(newLevels);
    setTotalXp(newXp);
    saveProgress(newLevels, newXp);
    
    // Update currentLevel to reflect completed lesson
    const updatedLevel = newLevels.find(l => l.id === currentLevel.id);
    if (updatedLevel) {
      setCurrentLevel(updatedLevel);
    }
    
    setShowSuccess(true);
  };

  const closeSuccess = () => {
    setShowSuccess(false);
    // Stay on level view but with updated state
    setCurrentLesson(null);
    setView("level");
  };

  const goBack = () => {
    if (view === "lesson") {
      // Return to level view with refreshed data
      if (currentLevel) {
        const updatedLevel = levels.find(l => l.id === currentLevel.id);
        if (updatedLevel) {
          setCurrentLevel(updatedLevel);
        }
      }
      setCurrentLesson(null);
      setView("level");
    } else if (view === "level") {
      setCurrentLevel(null);
      setView("home");
    } else {
      navigate("/dashboard");
    }
  };

  // Calculate progress
  const totalLessons = levels.reduce((acc, l) => acc + l.lessons.length, 0);
  const completedLessons = levels.reduce((acc, l) => acc + l.lessons.filter(les => les.completed).length, 0);
  const overallProgress = Math.round((completedLessons / totalLessons) * 100);

  // Get drum info helper
  const getDrum = (id: string) => DRUM_NOTES.find(d => d.id === id);

  const renderHome = () => (
    <div className="ln-home">
      {/* Welcome */}
      <div className="ln-welcome">
        <div className="ln-welcome-left">
          <h2>Lär dig läsa trumnoter</h2>
          <p>Se noten → Slå rätt trumma</p>
        </div>
        <div className="ln-welcome-right">
          <div className="ln-ring">
            <svg width="90" height="90">
              <circle className="ln-ring-bg" cx="45" cy="45" r="38" />
              <circle 
                className="ln-ring-fill" 
                cx="45" cy="45" r="38"
                strokeDasharray={`${overallProgress * 2.39} 239`}
              />
            </svg>
            <div className="ln-ring-center">
              <span className="ln-ring-pct">{overallProgress}%</span>
            </div>
          </div>
          <div className="ln-stats-mini">
            <div>⭐ {totalXp} XP</div>
            <div>✓ {completedLessons}/{totalLessons}</div>
          </div>
        </div>
      </div>

      {/* Drum Preview */}
      <section className="ln-drums-preview">
        <h3>Trummor du lär dig</h3>
        <div className="ln-drums-grid">
          {DRUM_NOTES.slice(0, 4).map(drum => (
            <div key={drum.id} className="ln-drum-preview-card" style={{ borderColor: drum.color }}>
              <div className="ln-drum-visual" style={{ background: drum.color }}>
                <span>{drum.symbol}</span>
              </div>
              <span className="ln-drum-name">{drum.name}</span>
              <span className="ln-drum-sound">{drum.sound}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Levels Grid */}
      <section className="ln-levels-section">
        <h3>Nivåer ({levels.length} totalt)</h3>
        <div className="ln-levels-grid">
          {levels.map(level => {
            const unlocked = isLevelUnlocked(level.id);
            const levelDone = level.lessons.filter(l => l.completed).length;
            const levelTotal = level.lessons.length;
            const pct = Math.round((levelDone / levelTotal) * 100);
            
            return (
              <div 
                key={level.id}
                className={`ln-level-card ${!unlocked ? 'locked' : ''} ${pct === 100 ? 'completed' : ''}`}
                style={{ '--card-color': level.color } as React.CSSProperties}
                onClick={() => selectLevel(level)}
                data-testid={`level-card-${level.id}`}
              >
                {!unlocked && <span className="ln-lock">🔒</span>}
                {pct === 100 && <span className="ln-check">✓</span>}
                <div className="ln-level-icon" style={{ background: level.color }}>{level.icon}</div>
                <div className="ln-level-info">
                  <span className="ln-level-num">Nivå {level.id}</span>
                  <h4>{level.title}</h4>
                  <div className="ln-level-drums">
                    {level.drumFocus.slice(0, 3).map(d => (
                      <span key={d} className="ln-mini-drum" style={{ background: getDrum(d)?.color }}>{getDrum(d)?.symbol}</span>
                    ))}
                    {level.drumFocus.length > 3 && <span className="ln-more">+{level.drumFocus.length - 3}</span>}
                  </div>
                </div>
                <div className="ln-level-progress-mini">
                  <div className="ln-prog-bar">
                    <div style={{ width: `${pct}%`, background: level.color }} />
                  </div>
                  <span>{levelDone}/{levelTotal}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );

  const renderLevel = () => {
    if (!currentLevel) return null;
    
    return (
      <div className="ln-level-view" style={{ '--level-color': currentLevel.color } as React.CSSProperties}>
        <div className="ln-level-header">
          <div className="ln-level-icon-big" style={{ background: currentLevel.color }}>{currentLevel.icon}</div>
          <div className="ln-level-header-info">
            <span className="ln-level-badge">Nivå {currentLevel.id}</span>
            <h2>{currentLevel.title}</h2>
            <p>{currentLevel.description}</p>
          </div>
        </div>

        {/* Drums in this level */}
        <div className="ln-level-drums-row">
          <span>Trummor i denna nivå:</span>
          <div className="ln-drums-list">
            {currentLevel.drumFocus.map(d => {
              const drum = getDrum(d);
              return drum ? (
                <div key={d} className="ln-drum-chip" style={{ background: drum.color }}>
                  <span className="ln-chip-symbol">{drum.symbol}</span>
                  <span>{drum.name}</span>
                </div>
              ) : null;
            })}
          </div>
        </div>

        {/* Lessons */}
        <div className="ln-lessons-list">
          {currentLevel.lessons.map((lesson, idx) => {
            const isUnlocked = idx === 0 || currentLevel.lessons[idx - 1].completed;
            const typeIcon = lesson.type === "intro" ? "👋" : lesson.type === "learn" ? "📖" : lesson.type === "practice" ? "🎯" : "❓";
            
            return (
              <div 
                key={lesson.id}
                className={`ln-lesson-card ${lesson.completed ? 'done' : ''} ${!isUnlocked ? 'locked' : ''}`}
                onClick={() => isUnlocked && startLesson(lesson)}
                data-testid={`lesson-${currentLevel.id}-${lesson.id}`}
              >
                <div className="ln-lesson-num" style={{ background: lesson.completed ? '#22c55e' : currentLevel.color }}>
                  {lesson.completed ? "✓" : idx + 1}
                </div>
                <div className="ln-lesson-info">
                  <h4>{typeIcon} {lesson.title}</h4>
                  <p>{lesson.description}</p>
                </div>
                <div className="ln-lesson-xp">+{lesson.xp} XP</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderLesson = () => {
    if (!currentLesson || !currentLevel) return null;

    // INTRO lesson
    if (currentLesson.type === "intro") {
      const steps = [
        <div key="intro-1" className="ln-step">
          <span className="ln-big-emoji">👋</span>
          <h2>Välkommen till Notläsning!</h2>
          <p>Här lär du dig att <strong>läsa trumnoter</strong>.</p>
          <p>Det handlar om en enkel sak:</p>
          <div className="ln-simple-rule">
            <span>Se en not</span>
            <span className="ln-arrow">→</span>
            <span>Slå rätt trumma</span>
          </div>
        </div>,
        <div key="intro-2" className="ln-step">
          <span className="ln-big-emoji">📍</span>
          <h2>Varje trumma har sin plats</h2>
          <p>I notbilden sitter varje trumma på en <strong>bestämd plats</strong>.</p>
          <div className="ln-staff-preview">
            <div className="ln-staff-line" />
            <div className="ln-staff-line" />
            <div className="ln-staff-line" />
            <div className="ln-staff-line" />
            <div className="ln-staff-line" />
            <div className="ln-note-indicator top">Hi-Hat ×</div>
            <div className="ln-note-indicator mid">Snare ●</div>
            <div className="ln-note-indicator bot">Kick ●</div>
          </div>
          <p>Du behöver bara lära dig var varje trumma sitter!</p>
        </div>,
        <div key="intro-3" className="ln-step ln-step-complete">
          <span className="ln-big-emoji">🎯</span>
          <h2>Redo att börja!</h2>
          <p>Vi börjar med <strong>en trumma i taget</strong>.</p>
          <p>Först ut: <span style={{ color: "#22c55e" }}>Hi-Hat!</span></p>
        </div>,
      ];

      return (
        <div className="ln-lesson-content">
          <div className="ln-progress-dots">
            {steps.map((_, i) => (
              <div key={i} className={`ln-dot ${i === lessonStep ? 'active' : i < lessonStep ? 'done' : ''}`} />
            ))}
          </div>
          {steps[lessonStep]}
          <div className="ln-lesson-nav">
            <button className="ln-btn" onClick={() => setLessonStep(p => p - 1)} disabled={lessonStep === 0}>
              Tillbaka
            </button>
            {lessonStep < steps.length - 1 ? (
              <button className="ln-btn primary" onClick={() => setLessonStep(p => p + 1)}>
                Nästa
              </button>
            ) : (
              <button className="ln-btn success" onClick={completeLesson}>
                Klar!
              </button>
            )}
          </div>
        </div>
      );
    }

    // LEARN lesson - show drum position
    if (currentLesson.type === "learn") {
      const drumsToShow = currentLesson.drums || [];
      
      const steps = drumsToShow.map((drumId, idx) => {
        const drum = getDrum(drumId);
        if (!drum) return null;
        return (
          <div key={`learn-${drumId}`} className="ln-step">
            <h2 style={{ color: drum.color }}>{drum.name}</h2>
            <div className="ln-drum-showcase" style={{ borderColor: drum.color }}>
              <div className="ln-drum-big" style={{ background: drum.color }}>
                <span className="ln-symbol-big">{drum.symbol}</span>
              </div>
              <div className="ln-drum-details">
                <div className="ln-detail-row">
                  <span>📍 Position:</span>
                  <strong>{drum.position}</strong>
                </div>
                <div className="ln-detail-row">
                  <span>🎵 Ljud:</span>
                  <strong>{drum.sound}</strong>
                </div>
              </div>
            </div>
            <div className="ln-mini-staff">
              <div className="ln-mini-lines">
                {[1,2,3,4,5].map(i => <div key={i} className="ln-mini-line" />)}
              </div>
              <div 
                className={`ln-mini-note ${drum.id}`} 
                style={{ background: drum.color }}
              >
                {drum.symbol}
              </div>
            </div>
            <p className="ln-remember">
              <strong>Kom ihåg:</strong> När du ser <span style={{ color: drum.color }}>{drum.symbol}</span> på denna plats → Slå {drum.name}!
            </p>
          </div>
        );
      }).filter(Boolean);

      // Add summary step if multiple drums
      if (drumsToShow.length > 1) {
        steps.push(
          <div key="summary" className="ln-step">
            <span className="ln-big-emoji">📚</span>
            <h2>Sammanfattning</h2>
            <div className="ln-summary-drums">
              {drumsToShow.map(drumId => {
                const drum = getDrum(drumId);
                if (!drum) return null;
                return (
                  <div key={drumId} className="ln-summary-item" style={{ borderColor: drum.color }}>
                    <div className="ln-sum-visual" style={{ background: drum.color }}>{drum.symbol}</div>
                    <span>{drum.name}</span>
                    <span className="ln-sum-pos">{drum.position}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      return (
        <div className="ln-lesson-content">
          <div className="ln-progress-dots">
            {steps.map((_, i) => (
              <div key={i} className={`ln-dot ${i === lessonStep ? 'active' : i < lessonStep ? 'done' : ''}`} />
            ))}
          </div>
          {steps[lessonStep]}
          <div className="ln-lesson-nav">
            <button className="ln-btn" onClick={() => setLessonStep(p => p - 1)} disabled={lessonStep === 0}>
              Tillbaka
            </button>
            {lessonStep < steps.length - 1 ? (
              <button className="ln-btn primary" onClick={() => setLessonStep(p => p + 1)}>
                Nästa
              </button>
            ) : (
              <button className="ln-btn success" onClick={completeLesson}>
                Jag förstår!
              </button>
            )}
          </div>
        </div>
      );
    }

    // PRACTICE or QUIZ - interactive note recognition
    if (currentLesson.type === "practice" || currentLesson.type === "quiz") {
      const availableDrums = (currentLesson.drums || []).map(id => getDrum(id)).filter(Boolean) as DrumNote[];
      
      return (
        <div className="ln-lesson-content">
          {/* Progress bar */}
          <div className="ln-quiz-progress">
            <div className="ln-quiz-bar">
              <div 
                className="ln-quiz-fill" 
                style={{ width: `${(questionNumber / totalQuestions) * 100}%` }} 
              />
            </div>
            <span>{questionNumber}/{totalQuestions}</span>
            <span className="ln-score">✓ {correctCount}</span>
          </div>

          {/* Question */}
          <div className="ln-question">
            <h2>Vilken trumma är detta?</h2>
            {currentDrum && (
              <div className="ln-target-drum" style={{ borderColor: showFeedback ? (isCorrect ? '#22c55e' : '#ef4444') : currentDrum.color }}>
                <div className="ln-note-display-area">
                  <div className="ln-mini-staff-q">
                    {[1,2,3,4,5].map(i => <div key={i} className="ln-mini-line" />)}
                    <div 
                      className={`ln-mini-note ${currentDrum.id}`}
                      style={{ background: currentDrum.color }}
                    >
                      {currentDrum.symbol}
                    </div>
                  </div>
                </div>
                {showFeedback && (
                  <div className={`ln-feedback ${isCorrect ? 'correct' : 'wrong'}`}>
                    {isCorrect ? '✓ Rätt!' : `✗ Det var ${currentDrum.name}`}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Drum options */}
          <div className="ln-drum-options" style={{ gridTemplateColumns: availableDrums.length <= 3 ? `repeat(${availableDrums.length}, 1fr)` : 'repeat(2, 1fr)' }}>
            {availableDrums.map(drum => (
              <button
                key={drum.id}
                className={`ln-drum-option ${selectedDrum === drum.id ? (isCorrect ? 'correct' : 'wrong') : ''} ${showFeedback && drum.id === currentDrum?.id && selectedDrum !== drum.id ? 'highlight' : ''}`}
                style={{ '--drum-color': drum.color } as React.CSSProperties}
                onClick={() => handleDrumSelect(drum.id)}
                disabled={showFeedback}
                data-testid={`drum-option-${drum.id}`}
              >
                <div className="ln-opt-visual" style={{ background: drum.color }}>{drum.symbol}</div>
                <span className="ln-opt-name">{drum.name}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="ln-app">
      <header className="ln-header">
        <button className="ln-back" onClick={goBack} data-testid="button-back">
          ← {view === "home" ? "Dashboard" : "Tillbaka"}
        </button>
        <h1>🎼 Lär dig noter</h1>
        <div className="ln-header-xp">⭐ {totalXp} XP</div>
      </header>

      <main className="ln-main">
        {view === "home" && renderHome()}
        {view === "level" && renderLevel()}
        {view === "lesson" && renderLesson()}
      </main>

      {/* Success Overlay */}
      {showSuccess && (
        <div className="ln-success-overlay" onClick={closeSuccess}>
          <div className="ln-success-content" onClick={e => e.stopPropagation()}>
            <span className="ln-success-icon">🎉</span>
            <h2>Bra jobbat!</h2>
            <div className="ln-success-xp">+{earnedXp} XP</div>
            <button className="ln-btn success" onClick={closeSuccess}>
              Fortsätt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
