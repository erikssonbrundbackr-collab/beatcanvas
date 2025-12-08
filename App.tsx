import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import React, { Suspense } from "react";
import CoordinationTrainer from "./pages/CoordinationTrainer";

// Startsida
import Home from "./Home";

// Nya sidor
import FreeDrums from "./pages/FreeDrums";
import TimingTrainer from "./pages/TimingTrainer";

// Instrument-sidor
import DrumVisualizer from "./components/DrumVisualizer";
import PianoTrainer from "./components/PianoTrainer";
import GuitarTrainer from "./components/GuitarTrainer";
import PianoVizualiser from "./components/PianoVisualizer";

// Policy
import PolicyPage from "./pages/PolicyPage";

// Autentisering
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";

// Dashboard
import Dashboard from "./pages/Dashboard";

// Lär dig trummor
import LearnDrums from "./pages/LearnDrums";
import LearnNotation from "./pages/LearnNotation";

// 🆕 Versus online
import VersusOnline from "./pages/VersusOnline";

// 🆕 Versus bot (ny fil)
import VersusBot from "./pages/VersusBot";

function ScrollToTop() {
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return null;
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />

      <Suspense
        fallback={
          <div style={{ textAlign: "center", padding: "50px" }}>
            Laddar...
          </div>
        }
      >
        <Routes>
          {/* 🏠 Startsida */}
          <Route path="/" element={<Home />} />

          {/* 🔑 Autentisering */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />

          {/* 🖥 Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* 🥁 Lär dig trummor */}
          <Route path="/learn-drums" element={<LearnDrums />} />

          {/* 🎼 Lär dig noter */}
          <Route path="/learn-notation" element={<LearnNotation />} />

          {/* 🥁 Fritt digitalt trumset */}
          <Route path="/free-drums" element={<FreeDrums />} />

          {/* ⏱️ Tajming-tränare */}
          <Route path="/timing-trainer" element={<TimingTrainer />} />

          {/* ⏱️ Tajming-tränare (duplicerad i din originalkod, låter den vara) */}
          <Route path="/timing-trainer" element={<TimingTrainer />} />

          {/* 🤝 Koordinations- & groove-tränare */}
          <Route path="/coordination-trainer" element={<CoordinationTrainer />} />

          {/* 🎵 Instrument */}
          <Route path="/drums" element={<DrumVisualizer />} />
          <Route path="/piano" element={<PianoTrainer />} />
          <Route path="/guitar" element={<GuitarTrainer />} />

          {/* 🎹 Piano Visualizer – ny sida */}
          <Route path="/piano-visualizer" element={<PianoVizualiser />} />

          {/* 🆕 Versus Online Battle */}
          <Route path="/versus-online" element={<VersusOnline />} />

          {/* 🆕 Versus Bot Battle */}
          <Route path="/versus-bot" element={<VersusBot />} />

          {/* 📜 Policy */}
          <Route path="/policy" element={<PolicyPage />} />

          {/* Fallback */}
          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
