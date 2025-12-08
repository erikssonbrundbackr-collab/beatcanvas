import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./LearnDrums.css";

interface Lesson {
  id: string;
  title: string;
  description: string;
  type: "intro" | "interactive" | "practice" | "challenge";
  xp: number;
  completed?: boolean;
}

interface Level {
  id: number;
  name: string;
  subtitle: string;
  icon: string;
  color: string;
  category: string;
  lessons: Lesson[];
}

const DRUM_PARTS = [
  { id: "kick", name: "Bastrumma", key: "K", color: "#ef4444", sound: "BOOM" },
  { id: "snare", name: "Virveltrumma", key: "S", color: "#3b82f6", sound: "CRACK" },
  { id: "hihat", name: "Hi-Hat", key: "H", color: "#22c55e", sound: "TSS" },
  { id: "tom1", name: "High Tom", key: "T", color: "#ec4899", sound: "TOM" },
  { id: "tom2", name: "Mid Tom", key: "Y", color: "#8b5cf6", sound: "TAM" },
  { id: "floor", name: "Floor Tom", key: "F", color: "#06b6d4", sound: "THUM" },
  { id: "crash", name: "Crash", key: "C", color: "#f59e0b", sound: "CRASH" },
  { id: "ride", name: "Ride", key: "R", color: "#84cc16", sound: "DING" },
];

const MIDI_TO_DRUM: Record<number, string> = {
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
  51: "ride",
  59: "ride",
};

const LEVELS: Level[] = [
  // ============ NIVÅ 1-5: ABSOLUT NYBÖRJARE ============
  {
    id: 1,
    name: "Trumset & Pinnar",
    subtitle: "Lär dig vad allt heter",
    icon: "🥁",
    color: "#22c55e",
    category: "Grunder",
    lessons: [
      { id: "1-1", title: "Välkommen!", description: "Introduktion till kursen", type: "intro", xp: 10 },
      { id: "1-2", title: "Trumsetet", description: "Klicka på varje del och lär dig namnen", type: "interactive", xp: 25 },
      { id: "1-3", title: "Hålla pinnarna", description: "Matched grip och balanspunkt", type: "interactive", xp: 25 },
      { id: "1-4", title: "Första slaget", description: "Enkla slag på virveln", type: "practice", xp: 30 },
      { id: "1-5", title: "Höger-Vänster", description: "R-L-R-L på virveln", type: "practice", xp: 35 },
    ],
  },
  {
    id: 2,
    name: "Sittställning",
    subtitle: "Kroppen och positionen",
    icon: "🪑",
    color: "#3b82f6",
    category: "Grunder",
    lessons: [
      { id: "2-1", title: "Stolhöjd", description: "Rätt höjd för benen", type: "intro", xp: 15 },
      { id: "2-2", title: "Fotplacering", description: "Kick och hi-hat pedal", type: "interactive", xp: 25 },
      { id: "2-3", title: "Rak rygg", description: "Avslappnade axlar", type: "interactive", xp: 25 },
      { id: "2-4", title: "Lugna slag", description: "Spela medan du sitter rätt", type: "practice", xp: 35 },
      { id: "2-5", title: "Avslappning", description: "Spela utan att spänna dig", type: "challenge", xp: 50 },
    ],
  },
  {
    id: 3,
    name: "Puls & Räkning",
    subtitle: "Bygg tidskänsla",
    icon: "⏱️",
    color: "#8b5cf6",
    category: "Grunder",
    lessons: [
      { id: "3-1", title: "Vad är puls?", description: "Känn hjärtslaget i musiken", type: "intro", xp: 15 },
      { id: "3-2", title: "Klappa 1-2-3-4", description: "Räkna högt samtidigt", type: "interactive", xp: 25 },
      { id: "3-3", title: "Hi-hat puls", description: "Fjärdedelar på hi-hat", type: "practice", xp: 35 },
      { id: "3-4", title: "Stabilt tempo", description: "Håll takten med/utan klick", type: "practice", xp: 40 },
      { id: "3-5", title: "Puls-utmaning", description: "Håll pulsen en hel minut", type: "challenge", xp: 60 },
    ],
  },
  {
    id: 4,
    name: "Första Beaten",
    subtitle: "Ditt första rock-beat",
    icon: "🎸",
    color: "#ef4444",
    category: "Grunder",
    lessons: [
      { id: "4-1", title: "Hi-hat fjärdedelar", description: "Lugnt tempo, jämna slag", type: "practice", xp: 30 },
      { id: "4-2", title: "Kick på 1 & 3", description: "Bastrumman ger tyngd", type: "practice", xp: 35 },
      { id: "4-3", title: "Snare på 2 & 4", description: "Backbeat - musikens hjärta", type: "practice", xp: 35 },
      { id: "4-4", title: "Standardbeat!", description: "Sätt ihop allt till ett beat", type: "practice", xp: 50 },
      { id: "4-5", title: "Beat-marathon", description: "Spela beatet utan paus", type: "challenge", xp: 70 },
    ],
  },
  {
    id: 5,
    name: "Dynamik & Kontroll",
    subtitle: "Starkt och svagt",
    icon: "🎚️",
    color: "#f59e0b",
    category: "Grunder",
    lessons: [
      { id: "5-1", title: "Forte & Piano", description: "Skillnad på starkt och svagt", type: "intro", xp: 20 },
      { id: "5-2", title: "Accenter", description: "Betona 2 & 4 på virveln", type: "practice", xp: 35 },
      { id: "5-3", title: "Tyst hi-hat", description: "Spela lätt på hi-hat", type: "practice", xp: 35 },
      { id: "5-4", title: "Kontrollmönster", description: "Byt mellan starkt och svagt", type: "practice", xp: 45 },
      { id: "5-5", title: "Dynamik-test", description: "Visa att du har kontroll", type: "challenge", xp: 75 },
    ],
  },

  // ============ NIVÅ 6-10: BEATS & FILLS ============
  {
    id: 6,
    name: "Beat-variationer",
    subtitle: "Utveckla ditt beat",
    icon: "🔄",
    color: "#06b6d4",
    category: "Beats & Fills",
    lessons: [
      { id: "6-1", title: "Åttondelar", description: "Hi-hat med dubbla slag", type: "intro", xp: 20 },
      { id: "6-2", title: "Åttondels hi-hat", description: "1-och-2-och-3-och-4-och", type: "practice", xp: 40 },
      { id: "6-3", title: "Extra kick", description: "Lägg till kick på '&'", type: "practice", xp: 45 },
      { id: "6-4", title: "Kick-varianter", description: "Olika kick-mönster", type: "practice", xp: 45 },
      { id: "6-5", title: "Variationsövning", description: "Byt mellan varianter", type: "challenge", xp: 80 },
    ],
  },
  {
    id: 7,
    name: "Fills Del 1",
    subtitle: "Virvel-fills",
    icon: "🎵",
    color: "#ec4899",
    category: "Beats & Fills",
    lessons: [
      { id: "7-1", title: "Vad är fills?", description: "Övergångar i musik", type: "intro", xp: 20 },
      { id: "7-2", title: "Virvel-fill", description: "Enkla slag i slutet av takten", type: "practice", xp: 40 },
      { id: "7-3", title: "3+1 struktur", description: "3 takter beat + 1 fill", type: "practice", xp: 45 },
      { id: "7-4", title: "Fill-varianter", description: "Tre enkla fill-mönster", type: "practice", xp: 45 },
      { id: "7-5", title: "Fill-flyt", description: "Smooth övergångar", type: "challenge", xp: 85 },
    ],
  },
  {
    id: 8,
    name: "Fills runt Toms",
    subtitle: "Spela runt setet",
    icon: "🌀",
    color: "#8b5cf6",
    category: "Beats & Fills",
    lessons: [
      { id: "8-1", title: "Möt toms", description: "Tom 1, Tom 2, Floor", type: "interactive", xp: 25 },
      { id: "8-2", title: "Tom-runda", description: "T1 → T2 → Floor → Floor", type: "practice", xp: 45 },
      { id: "8-3", title: "Beat + Tom-fill", description: "Koppla ihop beat och fill", type: "practice", xp: 50 },
      { id: "8-4", title: "Olika tom-fills", description: "Tre varianter", type: "practice", xp: 50 },
      { id: "8-5", title: "Tom-mästare", description: "Flytande tom-fills", type: "challenge", xp: 90 },
    ],
  },
  {
    id: 9,
    name: "Övergångar",
    subtitle: "Tappa inte bort dig",
    icon: "🔗",
    color: "#f97316",
    category: "Beats & Fills",
    lessons: [
      { id: "9-1", title: "Struktur", description: "2 beat + 2 fill", type: "intro", xp: 20 },
      { id: "9-2", title: "Tydlig struktur", description: "Räkna och håll koll", type: "practice", xp: 45 },
      { id: "9-3", title: "Tillbaka till beat", description: "Smooth landning", type: "practice", xp: 50 },
      { id: "9-4", title: "Uthållighet", description: "Repetera samma mönster", type: "practice", xp: 55 },
      { id: "9-5", title: "Övergångs-test", description: "5 rundor utan miss", type: "challenge", xp: 95 },
    ],
  },
  {
    id: 10,
    name: "Grunder Avslut",
    subtitle: "Kombinera allt",
    icon: "🏆",
    color: "#fbbf24",
    category: "Beats & Fills",
    lessons: [
      { id: "10-1", title: "Repetition", description: "Beat + fills sammanfattning", type: "intro", xp: 25 },
      { id: "10-2", title: "Kombo 1", description: "Basic beat + virvel-fill", type: "practice", xp: 50 },
      { id: "10-3", title: "Kombo 2", description: "Basic beat + tom-fill", type: "practice", xp: 55 },
      { id: "10-4", title: "Dynamik i fills", description: "Tyst → starkare", type: "practice", xp: 55 },
      { id: "10-5", title: "Del 1 Avslut", description: "Klara en hel sekvens", type: "challenge", xp: 120 },
    ],
  },

  // ============ NIVÅ 11-20: TEKNIK & DYNAMIK ============
  {
    id: 11,
    name: "Högerhand",
    subtitle: "Jämna hi-hat slag",
    icon: "🤚",
    color: "#22c55e",
    category: "Teknik",
    lessons: [
      { id: "11-1", title: "Handledsslag", description: "Avslappnad handled", type: "intro", xp: 25 },
      { id: "11-2", title: "Jämna åttondelar", description: "Exakt samma styrka", type: "practice", xp: 50 },
      { id: "11-3", title: "Tempo-kontroll", description: "Håll tempot stabilt", type: "practice", xp: 55 },
      { id: "11-4", title: "Snabbare tempo", description: "Öka lite i taget", type: "practice", xp: 55 },
      { id: "11-5", title: "Högerhand-test", description: "2 minuter stabilt", type: "challenge", xp: 100 },
    ],
  },
  {
    id: 12,
    name: "Vänsterhand",
    subtitle: "Ghost notes intro",
    icon: "👻",
    color: "#6366f1",
    category: "Teknik",
    lessons: [
      { id: "12-1", title: "Vad är ghost notes?", description: "Tysta virvelslag", type: "intro", xp: 25 },
      { id: "12-2", title: "Lätta slag", description: "Knappt hörbara", type: "practice", xp: 50 },
      { id: "12-3", title: "Stark + Svag", description: "Backbeat + ghost", type: "practice", xp: 55 },
      { id: "12-4", title: "Ghost-mönster", description: "Mellan starkare slag", type: "practice", xp: 60 },
      { id: "12-5", title: "Ghost-flyt", description: "Naturligt groove", type: "challenge", xp: 105 },
    ],
  },
  {
    id: 13,
    name: "Öppen Hi-Hat",
    subtitle: "Kontrollerad öppning",
    icon: "🔓",
    color: "#10b981",
    category: "Teknik",
    lessons: [
      { id: "13-1", title: "Öppen vs Stängd", description: "Skillnaden i ljud", type: "intro", xp: 25 },
      { id: "13-2", title: "Öppna lätt", description: "Liten öppning", type: "practice", xp: 50 },
      { id: "13-3", title: "Stäng snyggt", description: "Tss → Kontroll", type: "practice", xp: 55 },
      { id: "13-4", title: "Beat med öppen", description: "Öppna på rätt slag", type: "practice", xp: 60 },
      { id: "13-5", title: "Hi-hat kontroll", description: "Blanda öppen/stängd", type: "challenge", xp: 110 },
    ],
  },
  {
    id: 14,
    name: "Shuffle-feel",
    subtitle: "Gungande rytm",
    icon: "🌊",
    color: "#0ea5e9",
    category: "Teknik",
    lessons: [
      { id: "14-1", title: "Vad är shuffle?", description: "Triolkänsla", type: "intro", xp: 25 },
      { id: "14-2", title: "Triplet-känsla", description: "Ta-ka-ta Ta-ka-ta", type: "interactive", xp: 30 },
      { id: "14-3", title: "Shuffle hi-hat", description: "Sväng i åttondelarna", type: "practice", xp: 55 },
      { id: "14-4", title: "Shuffle beat", description: "Hela beatet gungar", type: "practice", xp: 60 },
      { id: "14-5", title: "Shuffle-groove", description: "Naturligt sväng", type: "challenge", xp: 115 },
    ],
  },
  {
    id: 15,
    name: "Kick-variationer",
    subtitle: "Mer bass i beatet",
    icon: "👢",
    color: "#ef4444",
    category: "Teknik",
    lessons: [
      { id: "15-1", title: "Kick-teknik", description: "Hälspets vs tå", type: "intro", xp: 25 },
      { id: "15-2", title: "Dubbla kick", description: "Två snabba slag", type: "practice", xp: 55 },
      { id: "15-3", title: "Synkoperad kick", description: "Kick på '&'", type: "practice", xp: 60 },
      { id: "15-4", title: "Kick-mönster", description: "Tre olika varianter", type: "practice", xp: 60 },
      { id: "15-5", title: "Kick-mästare", description: "Byt mellan mönster", type: "challenge", xp: 120 },
    ],
  },
  {
    id: 16,
    name: "16-delsnoter",
    subtitle: "Snabbare uppdelning",
    icon: "⚡",
    color: "#f59e0b",
    category: "Teknik",
    lessons: [
      { id: "16-1", title: "Vad är 16-delar?", description: "4 slag per taktslag", type: "intro", xp: 25 },
      { id: "16-2", title: "Räkna 16-delar", description: "1-e-och-a 2-e-och-a", type: "interactive", xp: 35 },
      { id: "16-3", title: "16-dels hi-hat", description: "Snabbare spel", type: "practice", xp: 60 },
      { id: "16-4", title: "16-dels fills", description: "Snabba fills", type: "practice", xp: 65 },
      { id: "16-5", title: "Speed-test", description: "Uthållighet i tempo", type: "challenge", xp: 125 },
    ],
  },
  {
    id: 17,
    name: "Dynamiska Beats",
    subtitle: "Vers vs Refräng",
    icon: "📊",
    color: "hsl(280, 70%, 50%)",
    category: "Teknik",
    lessons: [
      { id: "17-1", title: "Dynamik i låtar", description: "Tysta och höga delar", type: "intro", xp: 25 },
      { id: "17-2", title: "Vers-känsla", description: "Tyst och kontrollerat", type: "practice", xp: 55 },
      { id: "17-3", title: "Refräng-känsla", description: "Mer energi", type: "practice", xp: 60 },
      { id: "17-4", title: "Växla dynamik", description: "Vers → Refräng", type: "practice", xp: 65 },
      { id: "17-5", title: "Dynamik-flyt", description: "Smooth övergångar", type: "challenge", xp: 130 },
    ],
  },
  {
    id: 18,
    name: "Längre Fills",
    subtitle: "2-takts fills",
    icon: "🎼",
    color: "#ec4899",
    category: "Teknik",
    lessons: [
      { id: "18-1", title: "Längre fills", description: "Mer tid för kreativitet", type: "intro", xp: 25 },
      { id: "18-2", title: "2-takts virvel", description: "Bygga uppåt", type: "practice", xp: 60 },
      { id: "18-3", title: "2-takts toms", description: "Resa runt setet", type: "practice", xp: 65 },
      { id: "18-4", title: "Mixade fills", description: "Virvel + Toms", type: "practice", xp: 70 },
      { id: "18-5", title: "Fill-kreativitet", description: "Egna kombinationer", type: "challenge", xp: 135 },
    ],
  },
  {
    id: 19,
    name: "Crash & Accenter",
    subtitle: "Betona rätt slag",
    icon: "💥",
    color: "#f97316",
    category: "Teknik",
    lessons: [
      { id: "19-1", title: "Crash-användning", description: "När och varför", type: "intro", xp: 25 },
      { id: "19-2", title: "Crash på ettan", description: "Markera ny del", type: "practice", xp: 55 },
      { id: "19-3", title: "Fill → Crash", description: "Naturlig övergång", type: "practice", xp: 60 },
      { id: "19-4", title: "Ride-cymbal", description: "Alternativ till hi-hat", type: "practice", xp: 60 },
      { id: "19-5", title: "Cymbal-kontroll", description: "Rätt cymbal rätt tid", type: "challenge", xp: 130 },
    ],
  },
  {
    id: 20,
    name: "Teknik Avslut",
    subtitle: "Kombinera teknik",
    icon: "🎓",
    color: "#fbbf24",
    category: "Teknik",
    lessons: [
      { id: "20-1", title: "Teknik-sammanfattning", description: "Allt du lärt dig", type: "intro", xp: 30 },
      { id: "20-2", title: "Ghost + Öppen", description: "Kombinera tekniker", type: "practice", xp: 65 },
      { id: "20-3", title: "Shuffle + Dynamik", description: "Sväng med kontroll", type: "practice", xp: 70 },
      { id: "20-4", title: "Komplett groove", description: "Allt i ett beat", type: "practice", xp: 75 },
      { id: "20-5", title: "Teknik-mästare", description: "Visa allt!", type: "challenge", xp: 150 },
    ],
  },

  // ============ NIVÅ 21-30: KOMBINATIONER & UTHÅLLIGHET ============
  {
    id: 21,
    name: "Långa Grooves",
    subtitle: "Håll längre",
    icon: "⏰",
    color: "#22c55e",
    category: "Avancerat",
    lessons: [
      { id: "21-1", title: "Uthållighet", description: "Spela länge utan trötthet", type: "intro", xp: 30 },
      { id: "21-2", title: "3 minuters groove", description: "Samma beat, stabilt", type: "practice", xp: 70 },
      { id: "21-3", title: "Små variationer", description: "Lägg till detaljer", type: "practice", xp: 75 },
      { id: "21-4", title: "Dynamikförändringar", description: "Bygg upp och ner", type: "practice", xp: 80 },
      { id: "21-5", title: "Marathon", description: "5 minuter groove", type: "challenge", xp: 160 },
    ],
  },
  {
    id: 22,
    name: "Groove-byten",
    subtitle: "Byta mellan beats",
    icon: "🔀",
    color: "#6366f1",
    category: "Avancerat",
    lessons: [
      { id: "22-1", title: "Smidiga byten", description: "Utan att tappa takten", type: "intro", xp: 30 },
      { id: "22-2", title: "Beat A → B", description: "Två olika grooves", type: "practice", xp: 75 },
      { id: "22-3", title: "Med fills mellan", description: "Fill som brygga", type: "practice", xp: 80 },
      { id: "22-4", title: "3 grooves", description: "Byt i sekvens", type: "practice", xp: 85 },
      { id: "22-5", title: "Groove-karusell", description: "4 beats i rad", type: "challenge", xp: 170 },
    ],
  },
  {
    id: 23,
    name: "Flerstegs-övningar",
    subtitle: "Bygg på successivt",
    icon: "📈",
    color: "#10b981",
    category: "Avancerat",
    lessons: [
      { id: "23-1", title: "Lager på lager", description: "Börja enkelt, lägg till", type: "intro", xp: 30 },
      { id: "23-2", title: "Steg 1: Basic", description: "Enkel grund", type: "practice", xp: 75 },
      { id: "23-3", title: "Steg 2: Ghost notes", description: "Lägg till ghost", type: "practice", xp: 80 },
      { id: "23-4", title: "Steg 3: Fills", description: "Lägg till fills", type: "practice", xp: 85 },
      { id: "23-5", title: "Komplett paket", description: "Allt tillsammans", type: "challenge", xp: 175 },
    ],
  },
  {
    id: 24,
    name: "Synkoper",
    subtitle: "Betoning på fel ställe",
    icon: "〰️",
    color: "#0ea5e9",
    category: "Avancerat",
    lessons: [
      { id: "24-1", title: "Vad är synkop?", description: "Accent mellan slagen", type: "intro", xp: 30 },
      { id: "24-2", title: "Synkoperad kick", description: "Kick på '&'", type: "practice", xp: 80 },
      { id: "24-3", title: "Synkoperad snare", description: "Snare förväntar sig ej", type: "practice", xp: 85 },
      { id: "24-4", title: "Synkoperat beat", description: "Hela grooven gungar", type: "practice", xp: 90 },
      { id: "24-5", title: "Synkop-mästare", description: "Kontrollerad förvirring", type: "challenge", xp: 180 },
    ],
  },
  {
    id: 25,
    name: "Tempo-kontroll",
    subtitle: "Snabbt och långsamt",
    icon: "🎛️",
    color: "#ef4444",
    category: "Avancerat",
    lessons: [
      { id: "25-1", title: "Tempo-medvetenhet", description: "Känn skillnaden", type: "intro", xp: 30 },
      { id: "25-2", title: "Långsamt groove", description: "60 BPM kontroll", type: "practice", xp: 80 },
      { id: "25-3", title: "Snabbt groove", description: "140 BPM uthållighet", type: "practice", xp: 85 },
      { id: "25-4", title: "Tempo-växling", description: "Byt tempo smooth", type: "practice", xp: 90 },
      { id: "25-5", title: "Tempo-mästare", description: "Alla tempon", type: "challenge", xp: 185 },
    ],
  },
  {
    id: 26,
    name: "Fills på Beats",
    subtitle: "Fills som passar",
    icon: "🎨",
    color: "#f59e0b",
    category: "Avancerat",
    lessons: [
      { id: "26-1", title: "Fill-val", description: "Rätt fill till rätt beat", type: "intro", xp: 30 },
      { id: "26-2", title: "Rock-fills", description: "Fills för rock-beat", type: "practice", xp: 85 },
      { id: "26-3", title: "Funk-fills", description: "Fills för funk-groove", type: "practice", xp: 90 },
      { id: "26-4", title: "Ballad-fills", description: "Mjuka övergångar", type: "practice", xp: 90 },
      { id: "26-5", title: "Fill-bibliotek", description: "Välj rätt fill", type: "challenge", xp: 190 },
    ],
  },
  {
    id: 27,
    name: "Kompletta Låtdelar",
    subtitle: "Intro-Vers-Refräng",
    icon: "🎵",
    color: "#8b5cf6",
    category: "Avancerat",
    lessons: [
      { id: "27-1", title: "Låtstruktur", description: "Olika delar", type: "intro", xp: 30 },
      { id: "27-2", title: "Intro-groove", description: "Börja lugnt", type: "practice", xp: 85 },
      { id: "27-3", title: "Vers-groove", description: "Stödjande beat", type: "practice", xp: 90 },
      { id: "27-4", title: "Refräng-groove", description: "Full energi", type: "practice", xp: 95 },
      { id: "27-5", title: "Komplett låt", description: "Alla delar ihop", type: "challenge", xp: 200 },
    ],
  },
  {
    id: 28,
    name: "Improviserade Fills",
    subtitle: "Skapa egna fills",
    icon: "✨",
    color: "#ec4899",
    category: "Avancerat",
    lessons: [
      { id: "28-1", title: "Kreativitet", description: "Våga experimentera", type: "intro", xp: 30 },
      { id: "28-2", title: "Tom-impro", description: "Fria tom-fills", type: "practice", xp: 90 },
      { id: "28-3", title: "Virvel-impro", description: "Fria virvel-fills", type: "practice", xp: 95 },
      { id: "28-4", title: "Mixad impro", description: "Kombinera fritt", type: "practice", xp: 100 },
      { id: "28-5", title: "Impro-mästare", description: "Din egen stil", type: "challenge", xp: 210 },
    ],
  },
  {
    id: 29,
    name: "Mästarprov",
    subtitle: "Visa allt",
    icon: "🏅",
    color: "#f97316",
    category: "Avancerat",
    lessons: [
      { id: "29-1", title: "Repetition", description: "Allt du lärt dig", type: "intro", xp: 35 },
      { id: "29-2", title: "Teknik-test", description: "Ghost, öppen, dynamik", type: "practice", xp: 100 },
      { id: "29-3", title: "Groove-test", description: "Olika stilar", type: "practice", xp: 105 },
      { id: "29-4", title: "Fill-test", description: "Kreativa fills", type: "practice", xp: 110 },
      { id: "29-5", title: "Mästarprov", description: "Kombinera allt", type: "challenge", xp: 220 },
    ],
  },
  {
    id: 30,
    name: "Certifierad Trummis",
    subtitle: "Du kan spela trummor!",
    icon: "👑",
    color: "#fbbf24",
    category: "Avancerat",
    lessons: [
      { id: "30-1", title: "Grattis!", description: "Du har kommit hela vägen", type: "intro", xp: 50 },
      { id: "30-2", title: "Final groove 1", description: "Rock-groove komplett", type: "practice", xp: 110 },
      { id: "30-3", title: "Final groove 2", description: "Funk-groove komplett", type: "practice", xp: 115 },
      { id: "30-4", title: "Final groove 3", description: "Din egen groove", type: "practice", xp: 120 },
      { id: "30-5", title: "SLUTEXAMEN", description: "Du är en trummis!", type: "challenge", xp: 300 },
    ],
  },
];

const STORAGE_KEY = "learn_drums_progress_v2";

export default function LearnDrums() {
  const navigate = useNavigate();
  const [view, setView] = useState<"home" | "level" | "lesson">("home");
  const [levels, setLevels] = useState<Level[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        return LEVELS.map((level) => {
          const savedLevel = data.levels?.find((l: any) => l.id === level.id);
          return {
            ...level,
            lessons: level.lessons.map((lesson) => {
              const completed =
                savedLevel?.completedLessons?.includes(lesson.id) || false;
              return { ...lesson, completed };
            }),
          };
        });
      }
    } catch {}
    return LEVELS.map((l) => ({
      ...l,
      lessons: l.lessons.map((les) => ({ ...les, completed: false })),
    }));
  });
  const [currentLevel, setCurrentLevel] = useState<Level | null>(null);
  const [currentLesson, setCurrentLesson] = useState<
    (Lesson & { completed?: boolean }) | null
  >(null);
  const [lessonStep, setLessonStep] = useState(0);
  const [totalXp, setTotalXp] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).totalXp || 0;
    } catch {}
    return 0;
  });

  // Interactive state
  const [selectedDrum, setSelectedDrum] = useState<string | null>(null);
  const [clickedDrums, setClickedDrums] = useState<string[]>([]);
  const [practiceProgress, setPracticeProgress] = useState(0);
  const [practiceTarget, setPracticeTarget] = useState(10);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Success overlay
  const [showSuccess, setShowSuccess] = useState(false);
  const [earnedXp, setEarnedXp] = useState(0);

  // MIDI-läge (riktigt trumset)
  const [isMidiConnected, setIsMidiConnected] = useState(false);
  const [midiError, setMidiError] = useState<string | null>(null);
  const midiAccessRef = useRef<any | null>(null);

  // Check if level is unlocked
  const isLevelUnlocked = useCallback(
    (levelId: number) => {
      if (levelId === 1) return true;
      const prevLevel = levels.find((l) => l.id === levelId - 1);
      if (!prevLevel) return false;
      return prevLevel.lessons.every((l: any) => l.completed);
    },
    [levels]
  );

  // Save progress
  const saveProgress = useCallback((newLevels: Level[], newXp: number) => {
    try {
      const data = {
        totalXp: newXp,
        levels: newLevels.map((l) => ({
          id: l.id,
          completedLessons: l.lessons
            .filter((les: any) => les.completed)
            .map((les) => les.id),
        })),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, []);

  const selectLevel = (level: Level) => {
    if (!isLevelUnlocked(level.id)) return;
    setCurrentLevel(level);
    setView("level");
  };

  const startLesson = (lesson: Lesson & { completed?: boolean }) => {
    setCurrentLesson(lesson);
    setLessonStep(0);
    setClickedDrums([]);
    setPracticeProgress(0);
    setPracticeTarget(lesson.type === "challenge" ? 20 : 10);
    setShowFeedback(false);
    setView("lesson");
  };

  const handleDrumHit = (drumId: string, source: "click" | "midi" = "click") => {
    setSelectedDrum(drumId);
    setClickedDrums((prev) =>
      prev.includes(drumId) ? prev : [...prev, drumId]
    );

    if (currentLesson?.type === "practice" || currentLesson?.type === "challenge") {
      setPracticeProgress((p) => {
        const newP = p + 1;
        if (newP >= practiceTarget) {
          setTimeout(() => completeLesson(), 400);
        }
        return newP;
      });
    }
  };

  const handleDrumClick = (drumId: string) => {
    handleDrumHit(drumId, "click");
  };

  const connectMidi = async () => {
    setMidiError(null);

    if (
      typeof navigator === "undefined" ||
      !(navigator as any).requestMIDIAccess
    ) {
      setMidiError(
        "Din webbläsare stödjer inte WebMIDI. Testa Chrome eller Edge på dator."
      );
      return;
    }

    try {
      const access = await (navigator as any).requestMIDIAccess();
      midiAccessRef.current = access;

      const setupInputs = () => {
        const inputs = Array.from(access.inputs.values());
        const hasInputs = inputs.length > 0;
        setIsMidiConnected(hasInputs);

        inputs.forEach((input: any) => {
          input.onmidimessage = (event: any) => {
            const [status, note, velocity] = event.data;
            const isNoteOn = (status & 0xf0) === 0x90 && velocity > 0;
            if (!isNoteOn) return;

            const drumId = MIDI_TO_DRUM[note];
            if (drumId) {
              handleDrumHit(drumId, "midi");
            }
          };
        });
      };

      setupInputs();

      access.onstatechange = () => {
        setupInputs();
      };
    } catch (err) {
      console.error(err);
      setMidiError(
        "Kunde inte ansluta till ditt trumset. Kontrollera kabeln och testa igen."
      );
      setIsMidiConnected(false);
    }
  };

  const completeLesson = () => {
    if (!currentLesson || !currentLevel) return;

    const xpGain = currentLesson.xp;
    setEarnedXp(xpGain);

    const newLevels = levels.map((level) => {
      if (level.id === currentLevel.id) {
        return {
          ...level,
          lessons: level.lessons.map((les) =>
            les.id === currentLesson.id ? { ...les, completed: true } : les
          ),
        };
      }
      return level;
    });

    const newXp = totalXp + xpGain;
    setLevels(newLevels);
    setTotalXp(newXp);
    saveProgress(newLevels, newXp);

    const updatedLevel = newLevels.find((l) => l.id === currentLevel.id);
    if (updatedLevel) {
      setCurrentLevel(updatedLevel);
    }

    setShowSuccess(true);
  };

  const closeSuccess = () => {
    setShowSuccess(false);
    setCurrentLesson(null);
    setView("level");
  };

  const goBack = () => {
    if (view === "lesson") {
      if (currentLevel) {
        const updatedLevel = levels.find((l) => l.id === currentLevel.id);
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

  // Stats
  const totalLessons = levels.reduce((acc, l) => acc + l.lessons.length, 0);
  const completedLessons = levels.reduce(
    (acc, l) => acc + l.lessons.filter((les: any) => les.completed).length,
    0
  );
  const overallProgress = Math.round(
    (completedLessons / totalLessons) * 100
  );

  // Category groups
  const categories = [
    { name: "Grunder", levels: levels.filter((l) => l.category === "Grunder") },
    {
      name: "Beats & Fills",
      levels: levels.filter((l) => l.category === "Beats & Fills"),
    },
    { name: "Teknik", levels: levels.filter((l) => l.category === "Teknik") },
    {
      name: "Avancerat",
      levels: levels.filter((l) => l.category === "Avancerat"),
    },
  ];

  const renderHome = () => (
    <div className="ld-home">
      {/* Welcome */}
      <div className="ld-welcome">
        <div className="ld-welcome-left">
          <h2>Lär dig spela trummor</h2>
          <p>30 nivåer från nybörjare till mästare</p>
        </div>
        <div className="ld-welcome-right">
          <div className="ld-ring">
            <svg width="90" height="90">
              <circle className="ld-ring-bg" cx="45" cy="45" r="38" />
              <circle
                className="ld-ring-fill"
                cx="45"
                cy="45"
                r="38"
                strokeDasharray={`${overallProgress * 2.39} 239`}
              />
            </svg>
            <div className="ld-ring-center">
              <span className="ld-ring-pct">{overallProgress}%</span>
            </div>
          </div>
          <div className="ld-stats-mini">
            <div>⭐ {totalXp} XP</div>
            <div>
              ✓ {completedLessons}/{totalLessons}
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      {categories.map((cat) => (
        <section key={cat.name} className="ld-category">
          <h3 className="ld-category-title">{cat.name}</h3>
          <div className="ld-levels-grid">
            {cat.levels.map((level) => {
              const unlocked = isLevelUnlocked(level.id);
              const levelDone = level.lessons.filter(
                (l: any) => l.completed
              ).length;
              const levelTotal = level.lessons.length;
              const pct = Math.round((levelDone / levelTotal) * 100);

              return (
                <div
                  key={level.id}
                  className={`ld-level-card ${
                    !unlocked ? "locked" : ""
                  } ${pct === 100 ? "completed" : ""}`}
                  style={{ "--card-color": level.color } as React.CSSProperties}
                  onClick={() => selectLevel(level)}
                  data-testid={`level-card-${level.id}`}
                >
                  {!unlocked && <span className="ld-lock">🔒</span>}
                  {pct === 100 && <span className="ld-check">✓</span>}
                  <div
                    className="ld-level-icon"
                    style={{ background: level.color }}
                  >
                    {level.icon}
                  </div>
                  <div className="ld-level-info">
                    <span className="ld-level-num">Nivå {level.id}</span>
                    <h4>{level.name}</h4>
                    <p>{level.subtitle}</p>
                  </div>
                  <div className="ld-level-progress-mini">
                    <div className="ld-prog-bar">
                      <div
                        style={{ width: `${pct}%`, background: level.color }}
                      />
                    </div>
                    <span>
                      {levelDone}/{levelTotal}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );

  const renderLevel = () => {
    if (!currentLevel) return null;

    return (
      <div
        className="ld-level-view"
        style={{ "--level-color": currentLevel.color } as React.CSSProperties}
      >
        <div className="ld-level-header">
          <div
            className="ld-level-icon-big"
            style={{ background: currentLevel.color }}
          >
            {currentLevel.icon}
          </div>
          <div className="ld-level-header-info">
            <span className="ld-level-badge">Nivå {currentLevel.id}</span>
            <h2>{currentLevel.name}</h2>
            <p>{currentLevel.subtitle}</p>
          </div>
        </div>

        {/* Lessons */}
        <div className="ld-lessons-list">
          {currentLevel.lessons.map((lesson: any, idx: number) => {
            const isUnlocked =
              idx === 0 || currentLevel.lessons[idx - 1].completed;
            const typeIcon =
              lesson.type === "intro"
                ? "👋"
                : lesson.type === "interactive"
                ? "🖱️"
                : lesson.type === "practice"
                ? "🎯"
                : "🏆";
            const typeLabel =
              lesson.type === "intro"
                ? "Intro"
                : lesson.type === "interactive"
                ? "Interaktiv"
                : lesson.type === "practice"
                ? "Övning"
                : "Utmaning";

            return (
              <div
                key={lesson.id}
                className={`ld-lesson-card ${
                  lesson.completed ? "done" : ""
                } ${!isUnlocked ? "locked" : ""}`}
                onClick={() => isUnlocked && startLesson(lesson)}
                data-testid={`lesson-${lesson.id}`}
              >
                <div
                  className="ld-lesson-num"
                  style={{
                    background: lesson.completed
                      ? "#22c55e"
                      : currentLevel.color,
                  }}
                >
                  {lesson.completed ? "✓" : idx + 1}
                </div>
                <div className="ld-lesson-info">
                  <div className="ld-lesson-type">
                    {typeIcon} {typeLabel}
                  </div>
                  <h4>{lesson.title}</h4>
                  <p>{lesson.description}</p>
                </div>
                <div className="ld-lesson-xp">+{lesson.xp} XP</div>
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
      const introSteps = getIntroSteps(currentLesson.id, currentLevel.id);

      return (
        <div className="ld-lesson-content">
          <div className="ld-progress-dots">
            {introSteps.map((_, i) => (
              <div
                key={i}
                className={`ld-dot ${
                  i === lessonStep ? "active" : i < lessonStep ? "done" : ""
                }`}
              />
            ))}
          </div>
          <div className="ld-step">{introSteps[lessonStep]}</div>
          <div className="ld-lesson-nav">
            <button
              className="ld-btn"
              onClick={() => setLessonStep((p) => p - 1)}
              disabled={lessonStep === 0}
            >
              Tillbaka
            </button>
            {lessonStep < introSteps.length - 1 ? (
              <button
                className="ld-btn primary"
                onClick={() => setLessonStep((p) => p + 1)}
              >
                Nästa
              </button>
            ) : (
              <button className="ld-btn success" onClick={completeLesson}>
                Klar!
              </button>
            )}
          </div>
        </div>
      );
    }

    // INTERACTIVE lesson - drum explorer
    if (currentLesson.type === "interactive") {
      const allClicked = clickedDrums.length >= 4; // minst 4 olika delar

      return (
        <div className="ld-lesson-content">
          <h2>{currentLesson.title}</h2>
          <p>{currentLesson.description}</p>

          <p className="ld-mode-hint">
            {isMidiConnected ? (
              <>
                Slå 2–3 lugna slag på varje trumdel på ditt riktiga trumset. När
                du har känt in ljudet och skillnaden klickar du på samma del här
                nedan för att markera den som genomgången.
              </>
            ) : (
              <>
                Klicka igenom alla trumdelar. Läs namnet, säg det högt och tänk
                var den sitter på ett riktigt set. Har du ett e-trumset kan du
                koppla in det via knappen “Anslut trumset” högst upp.
              </>
            )}
          </p>

          <div className="ld-drum-explorer">
            {DRUM_PARTS.map((drum) => (
              <button
                key={drum.id}
                className={`ld-drum-btn ${
                  clickedDrums.includes(drum.id) ? "clicked" : ""
                } ${selectedDrum === drum.id ? "selected" : ""}`}
                style={{ "--drum-color": drum.color } as React.CSSProperties}
                onClick={() => handleDrumClick(drum.id)}
                data-testid={`drum-${drum.id}`}
              >
                <span className="ld-drum-visual">
                  {drum.id === "hihat"
                    ? "×"
                    : drum.id === "crash" || drum.id === "ride"
                    ? "○"
                    : "●"}
                </span>
                <span className="ld-drum-name">{drum.name}</span>
                <span className="ld-drum-sound">{drum.sound}</span>
              </button>
            ))}
          </div>

          <div className="ld-clicked-count">
            Trumdelar avprickade: {clickedDrums.length}/8
          </div>

          {allClicked && (
            <button className="ld-btn success" onClick={completeLesson}>
              Jag har gått igenom alla trumdelar
            </button>
          )}
        </div>
      );
    }

    // PRACTICE / CHALLENGE lesson
    if (currentLesson.type === "practice" || currentLesson.type === "challenge") {
      const progressPct = Math.round(
        (practiceProgress / practiceTarget) * 100
      );

      return (
        <div className="ld-lesson-content">
          <h2>{currentLesson.title}</h2>
          <p>{currentLesson.description}</p>

          <p className="ld-mode-hint">
            {isMidiConnected ? (
              <>
                Spela övningen på ditt trumset. Varje gång du klarar mönstret en
                gång (t.ex. 1–2 takter utan att tappa bort dig) räknas det som
                en repetition i stapeln. Appen känner av dina slag via MIDI.
              </>
            ) : (
              <>
                Har du inget trumset inkopplat just nu? Använd knapparna här
                nedanför för att simulera övningen och hålla koll på hur många
                repetitioner du gjort.
              </>
            )}
          </p>

          {/* Progress bar */}
          <div className="ld-practice-progress">
            <div className="ld-practice-bar">
              <div
                className="ld-practice-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span>
              Repetitioner: {practiceProgress}/{practiceTarget}
            </span>
          </div>

          {/* Practice drums */}
          <div className="ld-practice-area">
            <p className="ld-instruction">
              {isMidiConnected
                ? "Fokusera på de här trumdelarna i övningen:"
                : "Klicka på trummorna nedan varje gång du simulerar övningen:"}
            </p>
            <div className="ld-practice-drums">
              {getPracticeDrums(currentLesson.id).map((drumId) => {
                const drum = DRUM_PARTS.find((d) => d.id === drumId);
                if (!drum) return null;
                return (
                  <button
                    key={drum.id}
                    className="ld-practice-drum"
                    style={{ "--drum-color": drum.color } as React.CSSProperties}
                    onClick={() => handleDrumClick(drum.id)}
                    data-testid={`practice-drum-${drum.id}`}
                  >
                    <span className="ld-big-drum-visual">
                      {drum.id === "hihat"
                        ? "×"
                        : drum.id === "crash" || drum.id === "ride"
                        ? "○"
                        : "●"}
                    </span>
                    <span>{drum.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // Get intro steps based on lesson
  const getIntroSteps = (
    lessonId: string,
    levelId: number
  ): React.ReactNode[] => {
    // Default intro steps
    const defaultSteps = [
      <div key="1">
        <span className="ld-big-emoji">👋</span>
        <h2>Välkommen!</h2>
        <p>Dags att lära sig något nytt!</p>
      </div>,
      <div key="2">
        <span className="ld-big-emoji">🎯</span>
        <h2>Målet</h2>
        <p>Vi tar det steg för steg, lugnt och metodiskt.</p>
      </div>,
      <div key="3">
        <span className="ld-big-emoji">✅</span>
        <h2>Redo?</h2>
        <p>Klicka på "Klar" för att fortsätta!</p>
      </div>,
    ];

    // Custom steps for specific lessons
    if (lessonId === "1-1") {
      return [
        <div key="1">
          <span className="ld-big-emoji">🥁</span>
          <h2>Välkommen till trumkursen!</h2>
          <p>Här lär du dig spela trummor från grunden.</p>
        </div>,
        <div key="2">
          <span className="ld-big-emoji">📚</span>
          <h2>Hur det fungerar</h2>
          <p>30 nivåer tar dig från nybörjare till mästare.</p>
          <p>Varje nivå har 5 lektioner med övningar.</p>
        </div>,
        <div key="3">
          <span className="ld-big-emoji">🎯</span>
          <h2>Första steget</h2>
          <p>
            Vi börjar med att lära oss trumsetet och hur man håller pinnarna.
          </p>
        </div>,
      ];
    }

    if (lessonId === "2-1") {
      return [
        <div key="1">
          <span className="ld-big-emoji">🪑</span>
          <h2>Sittställning</h2>
          <p>Hur du sitter påverkar hur du spelar!</p>
        </div>,
        <div key="2">
          <span className="ld-big-emoji">📏</span>
          <h2>Stolhöjd</h2>
          <p>Låren ska vara lätt lutande nedåt. Knäna lite lägre än höfterna.</p>
        </div>,
        <div key="3">
          <span className="ld-big-emoji">✅</span>
          <h2>Bra position</h2>
          <p>Rak rygg, avslappnade axlar, fötterna platt på pedalerna.</p>
        </div>,
      ];
    }

    if (lessonId === "3-1") {
      return [
        <div key="1">
          <span className="ld-big-emoji">💓</span>
          <h2>Vad är puls?</h2>
          <p>
            Pulsen är musikens hjärtslag – det som får dig att nicka med
            huvudet.
          </p>
        </div>,
        <div key="2">
          <span className="ld-big-emoji">👏</span>
          <h2>Klappa med</h2>
          <p>Tänk: 1 - 2 - 3 - 4, 1 - 2 - 3 - 4...</p>
          <p>Jämna, stabila slag. Inte för snabbt!</p>
        </div>,
        <div key="3">
          <span className="ld-big-emoji">⏱️</span>
          <h2>Trummisar håller tiden</h2>
          <p>Din viktigaste uppgift är att hålla pulsen stabil.</p>
        </div>,
      ];
    }

    if (lessonId === "5-1") {
      return [
        <div key="1">
          <span className="ld-big-emoji">🔊</span>
          <h2>Dynamik</h2>
          <p>Dynamik = hur starkt eller svagt du spelar.</p>
        </div>,
        <div key="2">
          <span className="ld-big-emoji">📢</span>
          <h2>Forte (f)</h2>
          <p>Forte betyder starkt. Slå hårdare!</p>
        </div>,
        <div key="3">
          <span className="ld-big-emoji">🤫</span>
          <h2>Piano (p)</h2>
          <p>Piano betyder svagt. Lätta, kontrollerade slag.</p>
        </div>,
      ];
    }

    if (lessonId === "7-1") {
      return [
        <div key="1">
          <span className="ld-big-emoji">🎵</span>
          <h2>Vad är fills?</h2>
          <p>Fills är små "utfyllnader" mellan sektioner i en låt.</p>
        </div>,
        <div key="2">
          <span className="ld-big-emoji">🔄</span>
          <h2>Övergångar</h2>
          <p>
            Fills hjälper dig gå från vers till refräng, eller markera ett nytt
            avsnitt.
          </p>
        </div>,
        <div key="3">
          <span className="ld-big-emoji">🥁</span>
          <h2>Börja enkelt</h2>
          <p>
            Vi börjar med enkla virvel-fills. Senare lär vi oss fills runt hela
            setet!
          </p>
        </div>,
      ];
    }

    if (lessonId === "12-1") {
      return [
        <div key="1">
          <span className="ld-big-emoji">👻</span>
          <h2>Ghost Notes</h2>
          <p>
            Ghost notes är väldigt tysta virvelslag som ger grooven mer känsla.
          </p>
        </div>,
        <div key="2">
          <span className="ld-big-emoji">🤏</span>
          <h2>Knappt hörbara</h2>
          <p>Spela så lätt att du knappt hör det. Pinnen studsar bara lätt.</p>
        </div>,
        <div key="3">
          <span className="ld-big-emoji">🎭</span>
          <h2>Kontrast</h2>
          <p>
            Ghost notes gör att de STARKA slagen (backbeat) känns ännu starkare!
          </p>
        </div>,
      ];
    }

    if (lessonId === "14-1") {
      return [
        <div key="1">
          <span className="ld-big-emoji">🌊</span>
          <h2>Shuffle-feel</h2>
          <p>Shuffle ger musiken en "gungande" känsla.</p>
        </div>,
        <div key="2">
          <span className="ld-big-emoji">🎶</span>
          <h2>Triolkänsla</h2>
          <p>Istället för raka åttondelar: "ta-ta ta-ta"</p>
          <p>Blir det: "ta-ka-ta ta-ka-ta" (tretriol-feel)</p>
        </div>,
        <div key="3">
          <span className="ld-big-emoji">🎷</span>
          <h2>Blues & Jazz</h2>
          <p>
            Shuffle är vanligt i blues, jazz och swing. Låter mer "levande"!
          </p>
        </div>,
      ];
    }

    return defaultSteps;
  };

  // Get practice drums based on lesson
  const getPracticeDrums = (lessonId: string): string[] => {
    const levelNum = parseInt(lessonId.split("-")[0]);

    if (levelNum <= 3) return ["snare", "hihat"];
    if (levelNum <= 5) return ["snare", "hihat", "kick"];
    if (levelNum <= 7) return ["snare", "hihat", "kick"];
    if (levelNum <= 9) return ["snare", "hihat", "kick", "tom1", "tom2", "floor"];

    return ["snare", "hihat", "kick", "tom1", "tom2", "floor", "crash", "ride"];
  };

  return (
    <div className="ld-app">
      <header className="ld-header">
        <button
          className="ld-back"
          onClick={goBack}
          data-testid="button-back"
        >
          ← {view === "home" ? "Dashboard" : "Tillbaka"}
        </button>

        <h1>🥁 Lär dig spela</h1>

        <div className="ld-header-right">
          <div
            className={`ld-midi-pill ${isMidiConnected ? "ok" : "off"}`}
          >
            {isMidiConnected ? "MIDI anslutet" : "MIDI ej anslutet"}
          </div>
          <button className="ld-midi-btn" onClick={connectMidi}>
            {isMidiConnected ? "Sök trumset igen" : "Anslut trumset"}
          </button>
          <div className="ld-header-xp">⭐ {totalXp} XP</div>
        </div>
      </header>

      <main className="ld-main">
        {midiError && <p className="ld-midi-error">{midiError}</p>}
        {view === "home" && renderHome()}
        {view === "level" && renderLevel()}
        {view === "lesson" && renderLesson()}
      </main>

      {/* Success Overlay */}
      {showSuccess && (
        <div className="ld-success-overlay" onClick={closeSuccess}>
          <div
            className="ld-success-content"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="ld-success-icon">🎉</span>
            <h2>Bra jobbat!</h2>
            <div className="ld-success-xp">+{earnedXp} XP</div>
            <button className="ld-btn success" onClick={closeSuccess}>
              Fortsätt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
