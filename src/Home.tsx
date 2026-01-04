import DrumVisualizer from "@/components/DrumTrackVisualizer";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🥁 Drum Visualizer
          </h1>
          <p className="text-gray-600">
            Ladda upp ljudfil och MIDI för att se dina trumslag i 3D!
          </p>
        </div>

        <DrumVisualizer />

        <div className="mt-8 bg-white rounded-lg p-6 shadow-md border border-gray-200">
          <h2 className="font-semibold text-gray-800 mb-3">📖 Instruktioner:</h2>
          <ol className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="font-bold mr-2 text-blue-600">1.</span>
              <span>Ladda upp en ljudfil (MP3/WAV)</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2 text-blue-600">2.</span>
              <span>Ladda upp en MIDI-fil med trumspår</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2 text-blue-600">3.</span>
              <span>Klicka på "Analysera" för att parsa MIDI-filen</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2 text-blue-600">4.</span>
              <span>Tryck "Spela" och se noterna falla i 3D-perspektiv!</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
