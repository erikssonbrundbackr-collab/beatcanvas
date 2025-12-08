from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import mido
from typing import List
import uvicorn
import io

app = FastAPI()

# Tillåt att frontend kan nå backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mappa MIDI notnummer till trum-lanes
DRUM_MAP = {
    35: "kick", 36: "kick",
    38: "snare", 40: "snare",
    42: "hihat", 44: "hihat", 46: "hihat",
    49: "crash", 57: "crash",
    51: "ride", 53: "ride",
    43: "floor", 41: "floor",
    45: "tom1", 47: "tom1",
    48: "tom2", 50: "tom2"
}

@app.post("/analyze")
async def analyze(midi_file: UploadFile = File(...)):
    """Tar emot en MIDI-fil och returnerar en lista av trumslag."""
    content = await midi_file.read()
    mid = mido.MidiFile(file=io.BytesIO(content))

    ticks_per_beat = mid.ticks_per_beat
    tempo = 500000  # default 120bpm
    time_sec = 0
    events = []

    for track in mid.tracks:
        current_time = 0
        for msg in track:
            current_time += msg.time
            if msg.type == 'set_tempo':
                tempo = msg.tempo
            if msg.type == 'note_on' and msg.velocity > 0:
                if msg.note in DRUM_MAP:
                    seconds = mido.tick2second(current_time, ticks_per_beat, tempo)
                    events.append({"time": seconds, "lane": DRUM_MAP[msg.note]})
    events.sort(key=lambda e: e["time"])
    return {"events": events}

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
