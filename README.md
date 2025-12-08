# Spotify Drum Track Visualizer

En React + Vite-applikation som använder Spotifys Web Playback SDK för att visualisera trumspår i realtid.

## Funktioner

- **Spotify OAuth-inloggning** - Säker autentisering med ditt Spotify-konto
- **Realtidsuppspelning** - Använder Spotify Web Playback SDK för musikuppspelning
- **BPM-analys** - Hämtar tempoinformation från Spotify Audio Analysis API
- **Trumspårvisualisering** - Canvas-baserad visualisering som visar:
  - Bastrumma (röd)
  - Virvel (blå) 
  - Hi-hat (gul)
- **Responsiv design** - Fungerar på desktop och mobil
- **Mörkt/ljust tema** - Växla mellan teman

## Krav

- Spotify Premium-konto (krävs för Web Playback SDK)
- Node.js 18+ 
- Moderna webbläsare med HTML5 Canvas-stöd

## Installation och konfiguration

### 1. Skapa Spotify App

1. Gå till [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Klicka "Create app"
3. Fyll i appinformation:
   - **App name**: Din appnamn
   - **App description**: Beskrivning
   - **Redirect URI**: `http://localhost:5000/callback` (för utveckling)
   - **API/SDKs**: Markera "Web Playback SDK" och "Web API"

### 2. Konfigurera miljövariabler

Skapa en `.env`-fil i projektets root:

```env
# Spotify API-konfiguration
VITE_SPOTIFY_CLIENT_ID=din_client_id_här
SPOTIFY_CLIENT_SECRET=din_client_secret_här

# Session-konfiguration  
SESSION_SECRET=en_slumpmässig_sträng_för_sessioner
```

**Var hittar jag mina nycklar?**
- `VITE_SPOTIFY_CLIENT_ID`: I din Spotify app under "Settings" → "Basic Information"
- `SPOTIFY_CLIENT_SECRET`: Samma plats, klicka "View client secret"

### 3. Starta applikationen

```bash
# Installera beroenden
npm install

# Starta utvecklingsservern
npm run dev
```

Applikationen körs på `http://localhost:5000`

## Projektstruktur

```
client/src/
├── components/          # UI-komponenter
│   ├── SpotifyLogin.tsx       # OAuth-inloggning
│   ├── PlayerControls.tsx     # Uppspelningskontroller
│   ├── BPMDisplay.tsx         # BPM och musikanalys
│   ├── DrumTrackVisualizer.tsx # Canvas-baserad visualisering
│   └── ThemeToggle.tsx        # Tema-växlare
├── hooks/              # Custom React hooks för Spotify API
├── pages/              # Sidor
└── lib/                # Utilities och konfiguration

server/                 # Backend för OAuth-hantering
├── routes.ts           # API-rutter
└── storage.ts          # Datalagring
```

## Så här fungerar det

1. **Autentisering**: Användare loggar in med Spotify OAuth
2. **Token-hantering**: Säker lagring av access tokens
3. **Musikanalys**: Hämtar beat-data från Spotify Audio Analysis API
4. **Visualisering**: Rita trumspår på HTML5 Canvas synkroniserat med uppspelning
5. **Realtidsuppdatering**: Smooth animationer som följer musikens takt

## Utveckling

Applikationen använder:
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Express.js för OAuth callbacks
- **API**: Spotify Web API + Web Playback SDK

## Felsökning

**"Spotify Web Playback SDK not available"**
- Kontrollera att du har Spotify Premium
- Säkerställ att webbläsaren stöder Web Audio API

**"Invalid client credentials"**
- Verifiera att CLIENT_ID och CLIENT_SECRET är korrekta
- Kontrollera att redirect URI matchar i Spotify app-inställningar

**Canvas-visualisering fungerar inte**
- Kontrollera att webbläsaren stöder HTML5 Canvas
- Se konsolen för JavaScript-fel

## Licens

MIT License