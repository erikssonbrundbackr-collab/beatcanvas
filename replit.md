# Drum MIDI Visualizer

## Översikt
En React-app där användare kan ladda upp en ljudfil (MP3/WAV) och en MIDI-fil för trummor. Backend-servern (FastAPI) parsar MIDI-filen och returnerar en lista med trumslag och tider. Frontend spelar ljudfilen och visar fallande noter synkroniserade med musiken.

## Nuvarande Status
- ✅ FastAPI backend med /analyze endpoint för MIDI-parsing
- ✅ mido integration för MIDI-filparsing  
- ✅ React frontend med fil-uppladdning (ljudfil + MIDI-fil)
- ✅ Canvas-baserad drum track visualisering
- ✅ Audio playback med timeline och event highlighting
- ✅ Svensk språkinterface
- ✅ Supabase autentisering integrerad (Login, Register, Profile)
- ✅ Vite konfigurerad för port 5000 (fungerar med Replit preview)
- ✅ MIDI e-drum poängsättning med realtidsfeedback
- ✅ Singleton audio-element som överlever Hot Module Reload (HMR)

## Arkitektur
- **Frontend**: React + TypeScript + Vite (Port 5000)
- **Backend**: FastAPI + Python 3.11 (Port 8000)
- **MIDI Parsing**: mido för att läsa MIDI-filer och extrahera drum events
- **Visualization**: HTML5 Canvas för drum track rendering
- **State Management**: React hooks för audio playback och analysis state
- **Autentisering**: Supabase Auth (https://kqqahpiyntzsvwbqfxhr.supabase.co)
- **Routing**: React Router DOM för navigering

## Hur man kör applikationen

### Alternativ 1: Kör båda servrarna med ett kommando (Rekommenderas)
```bash
./start-dev.sh
```
Detta startar både Vite (port 5000) och FastAPI (port 8000) automatiskt med felkontroll och statusrapportering.

### Alternativ 2: Manuell start av båda servrarna

**Terminal 1 - Starta FastAPI backend:**
```bash
python3 -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 - Starta Vite frontend:**
```bash
npm run dev
```

### Alternativ 3: Skapa en Replit Workflow (Bäst för produktion)

1. Öppna "Workflows" panelen i Replit (sidomenyn)
2. Klicka på "+ Create Workflow"
3. Namnge den "Start Both Servers"
4. Välj "Parallel" mode
5. Lägg till två tasks:
   - **Task 1**: Execute Shell Command
     - Command: `python3 -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload`
     - Name: "Start Backend"
   - **Task 2**: Execute Shell Command  
     - Command: `npm run dev`
     - Name: "Start Frontend"
6. Spara workflow
7. Klicka på "Run" knappen och välj "Start Both Servers"

## Tillgång till applikationen

### I Utvecklingsmiljö (Development)
- Frontend: http://localhost:5000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### I Replit Production (Efter publicering)
- Applikationen kommer att vara tillgänglig på din Replit URL
- Både frontend och backend körs på samma domän
- Frontend använder automatiskt rätt URL baserat på miljön:
  - Dev: `http://localhost:8000`  
  - Production: samma origin (tom sträng)

## Backend API

### GET /
Hälsokontroll för backend servern.

**Response:**
```json
{
  "message": "FastAPI Drum MIDI Parser",
  "status": "online"
}
```

### POST /analyze
Tar emot en ljudfil och en MIDI-fil, parsar MIDI-filen och returnerar drum events.

**Request:**
- FormData med två filer:
  - `audio`: Ljudfil (MP3, WAV, etc.)
  - `midi`: MIDI-fil (.mid, .midi)

**Response:**
```json
{
  "events": [
    {"time": 0.5, "lane": "kick"},
    {"time": 1.0, "lane": "snare"},
    {"time": 1.5, "lane": "hihat"}
  ]
}
```

**Drum lanes:**
- `kick`: Bastrumma (MIDI notes 35, 36)
- `snare`: Virveltrumma (MIDI notes 38, 40)
- `hihat`: Hi-hat (MIDI notes 42, 44, 46)
- `crash`: Crash cymbal (MIDI notes 49, 55, 57)
- `ride`: Ride cymbal (MIDI notes 51, 59)
- `tom1`: High tom (MIDI notes 48, 50)
- `tom2`: Low tom (MIDI notes 45, 47)
- `floor`: Floor tom (MIDI notes 41, 43)

## Hur man använder applikationen

1. **Starta båda servrarna** (se instruktioner ovan)
2. **Öppna frontend** i webbläsaren (http://localhost:5000)
3. **Ladda upp filer:**
   - Välj en ljudfil (MP3/WAV) - detta är ljudet som kommer att spelas
   - Välj en MIDI-fil med drum tracks - detta innehåller timing för drum hits
4. **Klicka "Analysera"** - servern parsar MIDI-filen och returnerar drum events
5. **Klicka "Spela"** - ljudet spelas och noterna faller synkroniserat

## Testfiler
Det finns testfiler i `public/` mappen:
- `public/crazy_train.mp3` - Ljudfil
- `public/crazy_train.mid` - MIDI-fil med drum track

## Felsökning

### "Failed to fetch" fel
- Kontrollera att backend-servern körs på port 8000
- Kör: `curl http://localhost:8000/` 
- Om den inte svarar, starta backend: `python3 -m uvicorn server:app --host 0.0.0.0 --port 8000`

### Backend startar inte
- Kontrollera att mido är installerat: `pip list | grep mido`
- Installera om beroenden: `uv sync` eller `pip install -r requirements.txt`

### MIDI-filen parsas inte korrekt
- Kontrollera att MIDI-filen innehåller drum tracks (channel 9 i General MIDI)
- Vissa MIDI-filer använder andra kanaler för trummor
- Backend loggar ska visa om det hittas några drum events

## Tekniska Detaljer

### URL-konfiguration
Frontend använder automatisk URL-konfiguration:
```typescript
const API_BASE = import.meta.env.DEV 
  ? "http://localhost:8000"  // Development
  : "";                       // Production (same origin)
```

### MIDI Parsing
Backend använder `mido` för att läsa MIDI-filer:
- Läser alla tracks i MIDI-filen
- Filtrerar ut "note_on" events på channel 9 (standard drum channel)
- Konverterar MIDI ticks till sekunder baserat på tempo och ticks_per_beat
- Mappar MIDI note numbers till drum lanes enligt General MIDI standard

### Visualisering
- Canvas-baserad rendering för bästa prestanda
- Horisontell tidslinje med drum lanes
- Vita "playhead" linje visar aktuell position
- Events highlightas när de spelas (inom 0.1s fönster)

## MIDI Poängsättning

### Hur det fungerar
1. Anslut din MIDI e-drum via USB eller MIDI-kabel
2. Klicka på din MIDI-enhet i listan i appen
3. Välj en låt och tryck på Spela
4. Spela trummorna - systemet matchar dina slag mot MIDI-noterna

### Poängsystem
- **Perfect**: Inom 40ms av noten (+100 poäng)
- **Good**: Inom 100ms (+75 poäng)
- **Early/Late**: Inom 250ms (+25 poäng)
- **Miss**: Ingen matchning

### Teknisk Implementation
- **Singleton Audio Element**: Audio-elementet skapas som en global singleton (`window.__drumPlayerAudio`) som överlever Hot Module Reload (HMR). Detta löser problemet där HMR skapade nya audio-element medan det gamla fortsatte spela.
- **RAF Timing Loop**: 60fps requestAnimationFrame-loop för exakt timing (under 17ms precision)
- **Event-baserad state sync**: Native audio events (play/pause/ended) håller isPlaybackActive synkroniserad
- **Playback Guard**: MIDI-slag ignoreras när uppspelning inte är aktiv (ingen felaktig poängsättning vid paus)

### Felsökning MIDI
- **Ingen enhet visas**: Kontrollera att din MIDI-enhet är ansluten och att webbläsaren har MIDI-tillstånd
- **Poäng registreras inte**: Se till att du tryckt på Spela-knappen - slag ignoreras när audio är pausat
- **Alla slag missas**: Justera timing-offset med slidern för att kompensera för latens

## Användarpreferenser
- Föredrar svensk språk för dokumentation och UI
- Vill ha ren mappstruktur (components/, hooks/)
- Behöver Canvas-baserad visualisering för prestanda
- Värdesätter äkta MIDI-parsing över mock data
