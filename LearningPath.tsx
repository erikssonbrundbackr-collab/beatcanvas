import React, { useState } from "react";

type Lesson = {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  completed: boolean;
};

type LevelId = "beginner" | "intermediate" | "advanced";

type Level = {
  id: LevelId;
  name: string;
  description: string;
  recommendedFor: string;
  lessons: Lesson[];
};

const LEVELS: Level[] = [
  {
    id: "beginner",
    name: "Nivå 1 – Nybörjare",
    description: "För dig som precis börjat eller vill få en stabil grund.",
    recommendedFor: "0–3 månaders spelande",
    lessons: [
      {
        id: "b1",
        title: "Hålla trumstockar och sittställning",
        description:
          "Lär dig hur du sitter rätt, håller stockarna och får en avslappnad position.",
        estimatedMinutes: 10,
        completed: false,
      },
      {
        id: "b2",
        title: "Spela ett enkelt rockbeat",
        description:
          "Kick på 1 och 3, virvel på 2 och 4, hi-hat i jämna slag. Fokus: hålla jämn puls.",
        estimatedMinutes: 15,
        completed: false,
      },
      {
        id: "b3",
        title: "Spela till en enkel låt",
        description:
          "Använd ditt rockbeat och spela med till en lugn låt du gillar.",
        estimatedMinutes: 15,
        completed: false,
      },
    ],
  },
  {
    id: "intermediate",
    name: "Nivå 2 – Fortsättning",
    description: "När du kan grundbeat och vill få mer kontroll.",
    recommendedFor: "3–12 månaders spelande",
    lessons: [
      {
        id: "i1",
        title: "Variationer på rockbeat",
        description:
          "Lägg extra kick-slag och små variationer utan att tappa pulsen.",
        estimatedMinutes: 20,
        completed: false,
      },
      {
        id: "i2",
        title: "Enkla fills",
        description:
          "Öva korta fills på virvel och toms som leder tillbaka in i beatet.",
        estimatedMinutes: 20,
        completed: false,
      },
      {
        id: "i3",
        title: "Spela låt med fills",
        description:
          "Välj en låt och lägg in enkla fills i slutet av varje fjärde takt.",
        estimatedMinutes: 25,
        completed: false,
      },
    ],
  },
  {
    id: "advanced",
    name: "Nivå 3 – Avancerad",
    description: "För dig som har koll på grunderna och vill bli riktigt tight.",
    recommendedFor: "1+ års spelande",
    lessons: [
      {
        id: "a1",
        title: "Dynamik och kontroll",
        description:
          "Spela samma beat svagt, sedan starkt, och lär dig kontrollera volymen.",
        estimatedMinutes: 25,
        completed: false,
      },
      {
        id: "a2",
        title: "Synkoper och offbeat",
        description:
          "Utforska slag mellan pulsslagen för mer avancerad känsla.",
        estimatedMinutes: 30,
        completed: false,
      },
      {
        id: "a3",
        title: "Spela in ett helt trumkomp",
        description:
          "Spela ett komplett komp till en låt med både fills och dynamik.",
        estimatedMinutes: 30,
        completed: false,
      },
    ],
  },
];

const LearningPath: React.FC = () => {
  const [activeLevelId, setActiveLevelId] = useState<LevelId>("beginner");
  const [levelsState, setLevelsState] = useState<Level[]>(LEVELS);

  const activeLevel = levelsState.find((l) => l.id === activeLevelId)!;

  const handleToggleLesson = (lessonId: string) => {
    setLevelsState((prev) =>
      prev.map((level) =>
        level.id !== activeLevelId
          ? level
          : {
              ...level,
              lessons: level.lessons.map((lesson) =>
                lesson.id === lessonId
                  ? { ...lesson, completed: !lesson.completed }
                  : lesson
              ),
            }
      )
    );
  };

  const totalLessons = activeLevel.lessons.length;
  const completedLessons = activeLevel.lessons.filter((l) => l.completed).length;
  const progress =
    totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

  return (
    <div className="w-full rounded-2xl bg-slate-900/70 border border-slate-700/70 p-6 shadow-lg">
      <div className="flex flex-col gap-2 mb-4">
        <h2 className="text-xl font-semibold text-slate-50">
          Lär dig trummor – steg för steg
        </h2>
        <p className="text-sm text-slate-300">
          Välj en nivå och gå igenom lektionerna i din takt. Börja där du känner
          att du är idag – det finns inget ”fel” ställe att starta på.
        </p>
      </div>

      {/* Nivå-väljare */}
      <div className="flex flex-wrap gap-2 mb-4">
        {levelsState.map((level) => (
          <button
            key={level.id}
            onClick={() => setActiveLevelId(level.id)}
            className={`px-3 py-2 rounded-xl text-sm transition ${
              level.id === activeLevelId
                ? "bg-blue-500 text-white"
                : "bg-slate-800 text-slate-200 hover:bg-slate-700"
            }`}
          >
            {level.name}
          </button>
        ))}
      </div>

      {/* Info om aktiv nivå */}
      <div className="mb-4">
        <p className="text-sm text-slate-200 font-medium">
          {activeLevel.description}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Rekommenderas för: {activeLevel.recommendedFor}
        </p>
      </div>

      {/* Progress-bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-300 mb-1">
          <span>
            Framsteg: {completedLessons}/{totalLessons} lektioner klara
          </span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Lista med lektioner */}
      <div className="space-y-3">
        {activeLevel.lessons.map((lesson) => (
          <button
            key={lesson.id}
            onClick={() => handleToggleLesson(lesson.id)}
            className="w-full text-left rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 hover:bg-slate-800/80 transition flex flex-col gap-1"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-4 w-4 rounded-full border ${
                    lesson.completed
                      ? "bg-blue-500 border-blue-400"
                      : "border-slate-500"
                  }`}
                />
                <span className="text-sm font-semibold text-slate-50">
                  {lesson.title}
                </span>
              </div>
              <span className="text-xs text-slate-400 whitespace-nowrap">
                ca {lesson.estimatedMinutes} min
              </span>
            </div>
            <p className="text-xs text-slate-300">{lesson.description}</p>
            {lesson.completed && (
              <p className="text-[11px] text-green-400">
                Markerad som klar (endast på denna enhet).
              </p>
            )}
          </button>
        ))}
      </div>

      {/* Liten hint om framtid */}
      <p className="text-[11px] text-slate-500 mt-4">
        Senare kan vi koppla varje lektion till riktiga övningar och låtar i din
        DrumVisualizer.
      </p>
    </div>
  );
};

export default LearningPath;
