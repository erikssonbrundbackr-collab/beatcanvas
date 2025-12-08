import { useState, useEffect, useRef, useCallback } from "react";
import * as tf from '@tensorflow/tfjs';
import "./DrumFeedbackPanel.css";


export type LaneKey = "kick" | "snare" | "hihat" | "tom1" | "tom2" | "floor" | "crash" | "ride";

type MIDIInputDevice = {
  id: string;
  name: string | null;
  onmidimessage: ((event: any) => void) | null;
};

export interface DrumProfile {
  lane: LaneKey;
  name: string;
  peakFreqLow: number;
  peakFreqHigh: number;
  centroidLow: number;
  centroidHigh: number;
  minAmplitude: number;
  avgAmplitude: number;
  samples: number;
}

export interface HitResult {
  time: number;
  lane: LaneKey;
  accuracy: "perfect" | "good" | "early" | "late" | "miss";
  points: number;
}

interface Note {
  time: number;
  lane: LaneKey;
}

const DRUM_NAMES: Record<LaneKey, string> = {
  kick: "Bastrumma",
  snare: "Virveltrumma",
  hihat: "Hi-Hat",
  tom1: "Tom 1",
  tom2: "Tom 2",
  floor: "Floor Tom",
  crash: "Crash",
  ride: "Ride",
};

const DRUM_COLORS: Record<LaneKey, string> = {
  kick: "#ef4444",
  snare: "#3b82f6",
  hihat: "#fbbf24",
  tom1: "#22d3ee",
  tom2: "#34d399",
  floor: "#a78bfa",
  crash: "#fca5a5",
  ride: "#fde68a",
};

const STORAGE_KEY = "drum_profiles_v4";
const MIN_HIT_INTERVAL_MS = 80;

// ============================================================================
// AI-BASED DRUM DETECTION SYSTEM
// Uses spectral analysis + temporal patterns to distinguish drums from noise
// ============================================================================

// Pre-defined spectral signatures for different drum types
// Based on acoustic research on drum frequency characteristics
const DRUM_SIGNATURES: Record<string, {
  fundamentalLow: number;
  fundamentalHigh: number;
  centroidLow: number;
  centroidHigh: number;
  lowEnergyRatio: number;
  attackMs: number;
}> = {
  kick: {
    fundamentalLow: 40,
    fundamentalHigh: 120,
    centroidLow: 80,
    centroidHigh: 600,
    lowEnergyRatio: 0.55,
    attackMs: 5,
  },
  snare: {
    fundamentalLow: 150,
    fundamentalHigh: 350,
    centroidLow: 600,
    centroidHigh: 5000,
    lowEnergyRatio: 0.2,
    attackMs: 3,
  },
  hihat: {
    fundamentalLow: 300,
    fundamentalHigh: 1500,
    centroidLow: 2500,
    centroidHigh: 14000,
    lowEnergyRatio: 0.03,
    attackMs: 1,
  },
  tom1: {
    fundamentalLow: 100,
    fundamentalHigh: 250,
    centroidLow: 150,
    centroidHigh: 1800,
    lowEnergyRatio: 0.4,
    attackMs: 5,
  },
  tom2: {
    fundamentalLow: 80,
    fundamentalHigh: 200,
    centroidLow: 120,
    centroidHigh: 1500,
    lowEnergyRatio: 0.45,
    attackMs: 5,
  },
  floor: {
    fundamentalLow: 60,
    fundamentalHigh: 150,
    centroidLow: 100,
    centroidHigh: 1200,
    lowEnergyRatio: 0.5,
    attackMs: 6,
  },
  crash: {
    fundamentalLow: 200,
    fundamentalHigh: 600,
    centroidLow: 2000,
    centroidHigh: 12000,
    lowEnergyRatio: 0.08,
    attackMs: 2,
  },
  ride: {
    fundamentalLow: 300,
    fundamentalHigh: 700,
    centroidLow: 2200,
    centroidHigh: 10000,
    lowEnergyRatio: 0.06,
    attackMs: 2,
  },
};

interface AudioFeatures {
  amplitude: number;
  peakFrequency: number;
  spectralCentroid: number;
  spectralFlatness: number;
  lowEnergyRatio: number;
  zeroCrossingRate: number;
  isTransient: boolean;
  attackStrength: number;
}

export function useDrumFeedback() {
  const [inputMode, setInputMode] = useState<"none" | "mic" | "midi">("none");
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibratingDrum, setCalibratingDrum] = useState<LaneKey | null>(null);
  const [calibrationStep, setCalibrationStep] = useState(0);
  const [calibrationSamples, setCalibrationSamples] = useState<{
    peakFreqs: number[];
    centroids: number[];
    amplitudes: number[];
  }>({ peakFreqs: [], centroids: [], amplitudes: [] });

  const [profiles, setProfiles] = useState<DrumProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [detectedDrum, setDetectedDrum] = useState<LaneKey | null>(null);
  const [midiDevices, setMidiDevices] = useState<MIDIInputDevice[]>([]);
  const [selectedMidi, setSelectedMidi] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [hits, setHits] = useState<HitResult[]>([]);
  const [score, setScore] = useState({ perfect: 0, good: 0, early: 0, late: 0, miss: 0, total: 0 });
  const [currentAmplitude, setCurrentAmplitude] = useState(0);
  const [isPlaybackActive, setIsPlaybackActive] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [aiReady, setAiReady] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string>("");

  // Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const midiAccessRef = useRef<any>(null);

  // AI detection refs
  const amplitudeHistoryRef = useRef<number[]>([]);
  const previousSpectrumRef = useRef<Float32Array | null>(null);
  const lastDetectionTimeRef = useRef<number>(0);

  // Notes tracking
  const notesRef = useRef<Note[]>([]);
  const currentTimeRef = useRef<number>(0);
  const hitNotesRef = useRef<Set<string>>(new Set());
  const lastHitTimeRef = useRef<number>(0);
  const profilesRef = useRef<DrumProfile[]>([]);

  // Keep profiles ref in sync
  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);

  // Callbacks
  const onDrumHitRef = useRef<((lane: LaneKey, time: number) => void) | null>(null);
  const handleDrumHitRef = useRef<((lane: LaneKey) => void) | null>(null);

  // Initialize TensorFlow.js
  useEffect(() => {
    const init = async () => {
      await tf.ready();
      console.log('TensorFlow.js ready, backend:', tf.getBackend());
      setAiReady(true);
    };
    init();
  }, []);

  // Save profiles
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    } catch {}
  }, [profiles]);

  // Initialize MIDI – auto-connect to e-trummor direkt
  const initMidi = useCallback(async () => {
    try {
      const access = await navigator.requestMIDIAccess();
      midiAccessRef.current = access;

      const inputs: MIDIInputDevice[] = [];
      access.inputs.forEach((input: any) => inputs.push(input));
      setMidiDevices(inputs);

      if (inputs.length > 0) {
        // Försök hitta DTX/Yamaha/Drum först, annars ta första
        let chosen = inputs[0];
        for (const inp of inputs) {
          const name = (inp.name || "").toLowerCase();
          if (
            name.includes("dtx") ||
            name.includes("yamaha") ||
            name.includes("drum")
          ) {
            chosen = inp;
            break;
          }
        }

        // 🔥 Auto-koppla direkt så slag registreras utan klick
        connectMidi(chosen.id);
      }
    } catch (err) {
      console.error("MIDI not available:", err);
    }
  }, []); // connectMidi är stabil (useCallback([])), så detta är säkert

  // Initialize microphone
  const initMicrophone = useCallback(async () => {
    try {
      setMicError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });

      micStreamRef.current = stream;

      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0.1;
      source.connect(analyser);
      analyserRef.current = analyser;

      setInputMode("mic");
      setIsListening(true);

    } catch (err: any) {
      console.error("Mic error:", err);
      setMicError(err.message || "Kunde inte aktivera mikrofonen");
    }
  }, []);

  // Stop microphone
  const stopMicrophone = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setIsListening(false);
    setInputMode("none");
    setIsCalibrating(false);
    setCalibratingDrum(null);
    amplitudeHistoryRef.current = [];
    previousSpectrumRef.current = null;
  }, []);

  // Extract audio features using AI-enhanced analysis
  const extractFeatures = useCallback((): AudioFeatures | null => {
    if (!analyserRef.current || !audioContextRef.current) return null;

    const analyser = analyserRef.current;
    const sampleRate = audioContextRef.current.sampleRate;
    const bufferLength = analyser.frequencyBinCount;
    const frequencyData = new Float32Array(bufferLength);
    const timeData = new Float32Array(analyser.fftSize);

    analyser.getFloatFrequencyData(frequencyData);
    analyser.getFloatTimeDomainData(timeData);

    // Calculate RMS amplitude
    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
      sum += timeData[i] * timeData[i];
    }
    const amplitude = Math.sqrt(sum / timeData.length);
    setCurrentAmplitude(amplitude);

    // Track amplitude history for transient detection
    const history = amplitudeHistoryRef.current;
    history.push(amplitude);
    if (history.length > 15) history.shift();

    // Detect transient (sudden increase in amplitude)
    const recentAvg = history.length > 5 
      ? history.slice(-6, -1).reduce((a, b) => a + b, 0) / 5
      : 0;
    const isTransient = amplitude > recentAvg * 2.5 && amplitude > 0.025;
    const attackStrength = recentAvg > 0 ? amplitude / recentAvg : 0;

    if (!isTransient) return null;

    // Convert dB to linear for magnitude
    const magnitudes = new Float32Array(bufferLength);
    for (let i = 0; i < bufferLength; i++) {
      magnitudes[i] = Math.pow(10, frequencyData[i] / 20);
    }

    const binWidth = sampleRate / analyser.fftSize;

    // Find peak frequency (focus on 30-10000 Hz for drums)
    let maxMag = 0;
    let peakBin = 0;
    const minBin = Math.floor(30 / binWidth);
    const maxBin = Math.min(Math.floor(10000 / binWidth), bufferLength);

    for (let i = minBin; i < maxBin; i++) {
      if (magnitudes[i] > maxMag) {
        maxMag = magnitudes[i];
        peakBin = i;
      }
    }
    const peakFrequency = peakBin * binWidth;

    // Calculate spectral centroid
    let weightedSum = 0;
    let magnitudeSum = 0;
    for (let i = minBin; i < maxBin; i++) {
      const freq = i * binWidth;
      weightedSum += magnitudes[i] * freq;
      magnitudeSum += magnitudes[i];
    }
    const spectralCentroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;

    // Calculate spectral flatness (noise-like vs tonal)
    let geometricMean = 0;
    let arithmeticMean = 0;
    let count = 0;
    for (let i = minBin; i < maxBin; i++) {
      if (magnitudes[i] > 0.0001) {
        geometricMean += Math.log(magnitudes[i]);
        arithmeticMean += magnitudes[i];
        count++;
      }
    }
    geometricMean = count > 0 ? Math.exp(geometricMean / count) : 0;
    arithmeticMean = count > 0 ? arithmeticMean / count : 0;
    const spectralFlatness = arithmeticMean > 0 ? geometricMean / arithmeticMean : 0;

    // Calculate low energy ratio (energy below 300Hz / total)
    const lowFreqBin = Math.floor(300 / binWidth);
    let lowEnergy = 0;
    let totalEnergy = 0;
    for (let i = minBin; i < maxBin; i++) {
      const energy = magnitudes[i] * magnitudes[i];
      totalEnergy += energy;
      if (i < lowFreqBin) lowEnergy += energy;
    }
    const lowEnergyRatio = totalEnergy > 0 ? lowEnergy / totalEnergy : 0;

    // Calculate zero crossing rate (helps distinguish noise from tonal)
    let zeroCrossings = 0;
    for (let i = 1; i < timeData.length; i++) {
      if ((timeData[i] >= 0 && timeData[i - 1] < 0) || 
          (timeData[i] < 0 && timeData[i - 1] >= 0)) {
        zeroCrossings++;
      }
    }
    const zeroCrossingRate = zeroCrossings / timeData.length;

    return {
      amplitude,
      peakFrequency,
      spectralCentroid,
      spectralFlatness,
      lowEnergyRatio,
      zeroCrossingRate,
      isTransient,
      attackStrength,
    };
  }, []);

  // AI-based drum classification - STRICT MODE
  // This uses a whitelist approach: ONLY accept sounds that DEFINITELY match drums
  const classifyDrumAI = useCallback((features: AudioFeatures, targetDrum: LaneKey | null): {
    isDrum: boolean;
    matchesTarget: boolean;
    confidence: number;
    rejectionReason: string;
  } => {
    // =========================================================================
    // HARD REQUIREMENTS - Must pass ALL of these to even be considered
    // =========================================================================

    // 1. AMPLITUDE: Drums are LOUD. Reject quiet sounds immediately.
    // A real drum hit should have amplitude > 0.08 (quite loud)
    if (features.amplitude < 0.08) {
      return { isDrum: false, matchesTarget: false, confidence: 0, 
        rejectionReason: `För svagt (${(features.amplitude * 100).toFixed(0)}% - behöver >8%)` };
    }

    // 2. ATTACK: Drums have EXTREMELY fast attack (< 5ms rise time)
    // This is THE key differentiator - voice/breathing have slow attack
    if (features.attackStrength < 4) {
      return { isDrum: false, matchesTarget: false, confidence: 0, 
        rejectionReason: `För långsam attack (${features.attackStrength.toFixed(1)}x - behöver >4x)` };
    }

    // 3. HIGH ENERGY TRANSIENT: Drums create massive energy spike
    // attackStrength * amplitude should be high
    const transientEnergy = features.attackStrength * features.amplitude;
    if (transientEnergy < 0.4) {
      return { isDrum: false, matchesTarget: false, confidence: 0, 
        rejectionReason: `För låg transientenergi (${transientEnergy.toFixed(2)})` };
    }

    // =========================================================================
    // DRUM TYPE CLASSIFICATION - Now classify which drum it is
    // =========================================================================

    if (!targetDrum) {
      // Just checking if it's any drum
      return { isDrum: true, matchesTarget: true, confidence: 0.8, rejectionReason: "" };
    }

    const sig = DRUM_SIGNATURES[targetDrum];
    if (!sig) {
      return { isDrum: true, matchesTarget: false, confidence: 0, rejectionReason: "Okänd trumtyp" };
    }

    // For specific drum matching, use spectral characteristics
    let matches = true;
    let reason = "";

    // Different drums have VERY different low energy ratios
    // Kick: ~55% energy below 300Hz (lots of bass)
    // Snare: ~20% (mid-focused with high snare wire frequencies)
    // Hi-hat: ~3% (almost no bass, all high frequencies)

    const lowEnergyDiff = Math.abs(features.lowEnergyRatio - sig.lowEnergyRatio);
    const lowEnergyTolerance = 0.25;

    if (lowEnergyDiff > lowEnergyTolerance) {
      matches = false;
      if (features.lowEnergyRatio > sig.lowEnergyRatio + lowEnergyTolerance) {
        reason = `För mycket bas - kanske kick/tom?`;
      } else {
        reason = `För lite bas - kanske hi-hat/cymbal?`;
      }
    }

    // Spectral centroid must be in range
    const centroidInRange = features.spectralCentroid >= sig.centroidLow * 0.6 && 
                           features.spectralCentroid <= sig.centroidHigh * 1.4;
    if (!centroidInRange) {
      matches = false;
      if (features.spectralCentroid < sig.centroidLow * 0.6) {
        reason = `Frekvens för låg för ${DRUM_NAMES[targetDrum]}`;
      } else {
        reason = `Frekvens för hög för ${DRUM_NAMES[targetDrum]}`;
      }
    }

    if (!matches) {
      // Try to identify what it might be instead
      let detected: LaneKey | null = null;

      // Simple classification based on low energy ratio
      if (features.lowEnergyRatio > 0.4) {
        detected = "kick";
      } else if (features.lowEnergyRatio > 0.25) {
        detected = "tom1";
      } else if (features.lowEnergyRatio > 0.12) {
        detected = "snare";
      } else if (features.spectralCentroid > 3000) {
        detected = "hihat";
      } else {
        detected = "crash";
      }

      if (detected && detected !== targetDrum) {
        return { isDrum: true, matchesTarget: false, confidence: 0.5,
          rejectionReason: `Det lät mer som ${DRUM_NAMES[detected]}` };
      }

      return { isDrum: true, matchesTarget: false, confidence: 0.3, rejectionReason: reason };
    }

    return { isDrum: true, matchesTarget: true, confidence: 0.9, rejectionReason: "" };
  }, []);

  // Start calibration
  const startCalibration = useCallback((lane: LaneKey) => {
    setCalibratingDrum(lane);
    setIsCalibrating(true);
    setCalibrationStep(0);
    setCalibrationSamples({ peakFreqs: [], centroids: [], amplitudes: [] });
    setRejectionReason("");
  }, []);

  // Cancel calibration
  const cancelCalibration = useCallback(() => {
    setIsCalibrating(false);
    setCalibratingDrum(null);
    setCalibrationStep(0);
    setCalibrationSamples({ peakFreqs: [], centroids: [], amplitudes: [] });
    setRejectionReason("");
  }, []);

  // Save calibration profile
  const saveCalibration = useCallback(() => {
    if (!calibratingDrum || calibrationSamples.peakFreqs.length < 3) return false;

    const { peakFreqs, centroids, amplitudes } = calibrationSamples;

    // Sort and trim outliers
    const sortedFreqs = [...peakFreqs].sort((a, b) => a - b);
    const sortedCentroids = [...centroids].sort((a, b) => a - b);
    const sortedAmps = [...amplitudes].sort((a, b) => a - b);

    const trimStart = Math.floor(sortedFreqs.length * 0.1);
    const trimEnd = Math.ceil(sortedFreqs.length * 0.9);

    const trimmedFreqs = sortedFreqs.slice(trimStart, trimEnd);
    const trimmedCentroids = sortedCentroids.slice(trimStart, trimEnd);
    const trimmedAmps = sortedAmps.slice(trimStart, trimEnd);

    const avgAmp = trimmedAmps.reduce((a, b) => a + b, 0) / trimmedAmps.length;
    const freqSpread = Math.max(...trimmedFreqs) - Math.min(...trimmedFreqs);
    const centroidSpread = Math.max(...trimmedCentroids) - Math.min(...trimmedCentroids);

    const newProfile: DrumProfile = {
      lane: calibratingDrum,
      name: DRUM_NAMES[calibratingDrum],
      peakFreqLow: Math.min(...trimmedFreqs) - freqSpread * 0.3,
      peakFreqHigh: Math.max(...trimmedFreqs) + freqSpread * 0.3,
      centroidLow: Math.min(...trimmedCentroids) - centroidSpread * 0.3,
      centroidHigh: Math.max(...trimmedCentroids) + centroidSpread * 0.3,
      minAmplitude: Math.min(...trimmedAmps) * 0.5,
      avgAmplitude: avgAmp,
      samples: peakFreqs.length,
    };

    console.log("Saved profile:", newProfile);

    setProfiles(prev => {
      const filtered = prev.filter(p => p.lane !== calibratingDrum);
      return [...filtered, newProfile];
    });

    setIsCalibrating(false);
    setCalibratingDrum(null);
    setCalibrationStep(0);
    setCalibrationSamples({ peakFreqs: [], centroids: [], amplitudes: [] });
    setRejectionReason("");

    return true;
  }, [calibratingDrum, calibrationSamples]);

  const removeProfile = useCallback((lane: LaneKey) => {
    setProfiles(prev => prev.filter(p => p.lane !== lane));
  }, []);

  // AI-powered calibration detection loop
  useEffect(() => {
    if (!isCalibrating || !calibratingDrum || inputMode !== "mic") return;

    let frameId: number;
    let lastCaptureTime = 0;

    const detectCalibration = () => {
      const now = Date.now();

      if (now - lastCaptureTime > 150) { // Rate limit
        const features = extractFeatures();

        if (features && features.isTransient) {
          // Use AI to validate this is the correct drum sound
          const classification = classifyDrumAI(features, calibratingDrum);

          if (classification.rejectionReason) {
            setRejectionReason(classification.rejectionReason);
            // Clear rejection message after 1.5 seconds
            setTimeout(() => setRejectionReason(""), 1500);
          }

          if (classification.isDrum && classification.matchesTarget) {
            lastCaptureTime = now;

            console.log("AI accepted calibration sample:", features);

            setCalibrationSamples(prev => ({
              peakFreqs: [...prev.peakFreqs, features.peakFrequency],
              centroids: [...prev.centroids, features.spectralCentroid],
              amplitudes: [...prev.amplitudes, features.amplitude],
            }));

            setCalibrationStep(prev => prev + 1);
            setRejectionReason("");

            // Flash detected
            setDetectedDrum(calibratingDrum);
            setTimeout(() => setDetectedDrum(null), 150);
          }
        }
      }

      frameId = requestAnimationFrame(detectCalibration);
    };

    frameId = requestAnimationFrame(detectCalibration);
    return () => cancelAnimationFrame(frameId);
  }, [isCalibrating, calibratingDrum, inputMode, extractFeatures, classifyDrumAI]);

  // Auto-save when enough samples
  useEffect(() => {
    if (calibrationSamples.peakFreqs.length >= 5 && isCalibrating) {
      saveCalibration();
    }
  }, [calibrationSamples.peakFreqs.length, isCalibrating, saveCalibration]);

  // MIDI handling - uses ref to always call latest handleDrumHit
  const connectMidi = useCallback((deviceId: string) => {
    if (!midiAccessRef.current) {
      console.error("[MIDI] No MIDI access available");
      return;
    }

    // Clear existing handlers
    midiAccessRef.current.inputs.forEach((input: any) => {
      input.onmidimessage = null;
    });

    const device = midiAccessRef.current.inputs.get(deviceId);
    if (!device) {
      console.error("[MIDI] Device not found:", deviceId);
      return;
    }

    console.log("[MIDI] Connecting to:", device.name);

    device.onmidimessage = (event: any) => {
      const [status, note, velocity] = event.data;

      // Note On message (144-159) with velocity > 0
      if (status >= 144 && status <= 159 && velocity > 0) {
        const lane = midiNoteToLane(note);
        console.log(`[MIDI] Note ${note} vel ${velocity} -> lane: ${lane}`);

        if (lane) {
          // Call the latest handleDrumHit via ref
          if (handleDrumHitRef.current) {
            handleDrumHitRef.current(lane);
          } else {
            console.error("[MIDI] handleDrumHitRef not set!");
          }
        }
      }
    };

    setSelectedMidi(deviceId);
    setInputMode("midi");
    setIsListening(true);
    console.log("[MIDI] Connected successfully");
  }, []);

  const disconnectMidi = useCallback(() => {
    if (midiAccessRef.current) {
      midiAccessRef.current.inputs.forEach((input: any) => {
        input.onmidimessage = null;
      });
    }
    setSelectedMidi(null);
    setInputMode("none");
    setIsListening(false);
  }, []);

  // Ref for isPlaybackActive to avoid stale closure in handleDrumHit
  // NOTE: This ref is also updated directly in attachAudioElement to avoid race conditions
  // between async setState and MIDI events that arrive before the next render
  const isPlaybackActiveRef = useRef(isPlaybackActive);
  isPlaybackActiveRef.current = isPlaybackActive;

  // Handle drum hit - core scoring logic
  // NOTE: Uses refs to avoid stale closures
  const handleDrumHit = useCallback((lane: LaneKey) => {
    const now = currentTimeRef.current;
    const notes = notesRef.current;
    const playbackActive = isPlaybackActiveRef.current;

    setDetectedDrum(lane);

    // Only score when playback is active - ignore hits when paused
    if (!playbackActive) {
      console.log(`[MIDI] Hit ignored (playback inactive): ${lane}`);
      setTimeout(() => setDetectedDrum(null), 150);
      return;
    }

    // Debug logging
    console.log(`[MIDI] Hit: ${lane} | time: ${now.toFixed(3)}s | notes: ${notes.length}`);

    if (onDrumHitRef.current) {
      onDrumHitRef.current(lane, now);
    }

    if (notes.length === 0) {
      console.log("No notes to match against!");
      setTimeout(() => setDetectedDrum(null), 150);
      return;
    }

    const hitWindow = 0.25; // Increased window slightly

    let matchedNote: Note | null = null;
    let accuracy: HitResult["accuracy"] = "miss";
    let timeDiff = Infinity;

    for (const note of notes) {
      if (note.lane !== lane) continue;

      const noteKey = `${note.time.toFixed(3)}-${note.lane}`;
      if (hitNotesRef.current.has(noteKey)) continue;

      const diff = now - note.time;

      if (Math.abs(diff) < hitWindow && Math.abs(diff) < Math.abs(timeDiff)) {
        timeDiff = diff;
        matchedNote = note;

        if (Math.abs(diff) < 0.04) accuracy = "perfect";
        else if (Math.abs(diff) < 0.1) accuracy = "good";
        else if (diff < 0) accuracy = "early";
        else accuracy = "late";
      }
    }

    if (matchedNote) {
      const noteKey = `${matchedNote.time.toFixed(3)}-${matchedNote.lane}`;
      hitNotesRef.current.add(noteKey);

      const points = accuracy === "perfect" ? 100 : accuracy === "good" ? 75 : accuracy === "early" || accuracy === "late" ? 25 : 0;

      const hit: HitResult = { time: now, lane, accuracy, points };
      setHits(prev => [...prev.slice(-50), hit]);

      setScore(prev => ({
        ...prev,
        [accuracy]: prev[accuracy] + 1,
        total: prev.total + points,
      }));

      console.log(`HIT! ${lane} - ${accuracy} (+${points}pts) diff: ${(timeDiff * 1000).toFixed(0)}ms`);
    } else {
      // Find closest note for debugging
      const sameLayerNotes = notes.filter(n => n.lane === lane && !hitNotesRef.current.has(`${n.time.toFixed(3)}-${n.lane}`));
      if (sameLayerNotes.length > 0) {
        const closest = sameLayerNotes.reduce((a, b) => 
          Math.abs(a.time - now) < Math.abs(b.time - now) ? a : b
        );
        console.log(`No match for ${lane}. Closest note at ${closest.time.toFixed(3)}s (diff: ${((now - closest.time) * 1000).toFixed(0)}ms)`);
      }
    }

    setTimeout(() => setDetectedDrum(null), 150);
  }, [isListening]);

  // CRITICAL: Update ref immediately, not via useEffect
  // This ensures MIDI callback always has access to the function
  handleDrumHitRef.current = handleDrumHit;

  // Re-attach MIDI handlers when handleDrumHit changes (ensures fresh closure)
  useEffect(() => {
    if (selectedMidi && midiAccessRef.current) {
      const device = midiAccessRef.current.inputs.get(selectedMidi);
      if (device) {
        device.onmidimessage = (event: any) => {
          const [status, note, velocity] = event.data;
          if (status >= 144 && status <= 159 && velocity > 0) {
            const lane = midiNoteToLane(note);
            console.log(`[MIDI] Note ${note} vel ${velocity} -> lane: ${lane}`);
            if (lane && handleDrumHitRef.current) {
              handleDrumHitRef.current(lane);
            }
          }
        };
        console.log("[MIDI] Handlers refreshed");
      }
    }
  }, [selectedMidi, handleDrumHit]);

  // Miss detection - works for both MIDI and mic mode
  useEffect(() => {
    if (!isListening) return;

    // For mic mode, require profiles. For MIDI, always run.
    const isMidiMode = inputMode === "midi";
    if (!isMidiMode && profiles.length === 0) return;

    const interval = setInterval(() => {
      if (!isPlaybackActive) return;

      const now = currentTimeRef.current;
      const notes = notesRef.current;
      const missWindow = 0.3; // 300ms grace period

      // For mic mode, only track configured lanes. For MIDI, track all lanes.
      const profileLanes = isMidiMode 
        ? new Set(["kick", "snare", "hihat", "tom1", "tom2", "floor", "crash", "ride"] as LaneKey[])
        : new Set(profiles.map(p => p.lane));

      for (const note of notes) {
        if (!profileLanes.has(note.lane)) continue;

        const noteKey = `${note.time.toFixed(3)}-${note.lane}`;
        if (hitNotesRef.current.has(noteKey)) continue;

        if (now - note.time > missWindow) {
          hitNotesRef.current.add(noteKey);

          const hit: HitResult = { 
            time: note.time, 
            lane: note.lane, 
            accuracy: "miss", 
            points: 0 
          };
          setHits(prev => [...prev.slice(-50), hit]);
          setScore(prev => ({ ...prev, miss: prev.miss + 1 }));
          console.log(`Miss: ${note.lane} at ${note.time.toFixed(3)}s (current: ${now.toFixed(3)}s)`);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isListening, profiles, isPlaybackActive, inputMode]);

  // AI-powered mic detection loop (for play mode)
  useEffect(() => {
    if (inputMode !== "mic" || !isListening || isCalibrating) return;
    if (profiles.length === 0) return;

    let frameId: number;

    const detect = () => {
      const now = Date.now();

      if (now - lastHitTimeRef.current >= MIN_HIT_INTERVAL_MS) {
        const features = extractFeatures();

        if (features && features.isTransient) {
          // Use AI to classify the drum
          const classification = classifyDrumAI(features, null);

          if (classification.isDrum && classification.matchesTarget) {
            // Find best matching configured profile
            let bestMatch: LaneKey | null = null;
            let bestScore = 0;

            for (const profile of profilesRef.current) {
              let score = 0;

              if (features.spectralCentroid >= profile.centroidLow && 
                  features.spectralCentroid <= profile.centroidHigh) {
                score += 40;
              }

              if (features.peakFrequency >= profile.peakFreqLow && 
                  features.peakFrequency <= profile.peakFreqHigh) {
                score += 30;
              }

              if (features.amplitude >= profile.minAmplitude) {
                score += 30;
              }

              if (score > bestScore && score >= 60) {
                bestScore = score;
                bestMatch = profile.lane;
              }
            }

            if (bestMatch) {
              handleDrumHit(bestMatch);
              lastHitTimeRef.current = now;
            }
          }
        }
      }

      frameId = requestAnimationFrame(detect);
    };

    frameId = requestAnimationFrame(detect);
    return () => cancelAnimationFrame(frameId);
  }, [inputMode, isListening, isCalibrating, profiles.length, extractFeatures, classifyDrumAI, handleDrumHit]);

  // Audio element ref for direct event binding
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioListenersRef = useRef<{
    handlePlay: () => void;
    handlePause: () => void;
    handleEnded: () => void;
    rafId: number | null;
  } | null>(null);

  // Set notes to track
  const setNotesToTrack = useCallback((notes: Note[]) => {
    notesRef.current = notes;
    if (notes.length > 0) {
      console.log(`[Feedback] Loaded ${notes.length} notes`);
    }
  }, []);

  // Attach to audio element directly - survives hot reload!
  const attachAudioElement = useCallback((audio: HTMLAudioElement | null) => {
    // Clean up old listeners using stored references - do this BEFORE resetting refs
    const oldListeners = audioListenersRef.current;
    const oldAudio = audioElementRef.current;

    if (oldAudio && oldListeners) {
      // Cancel RAF loop FIRST before any other cleanup
      if (oldListeners.rafId !== null) {
        cancelAnimationFrame(oldListeners.rafId);
        oldListeners.rafId = null;
      }

      oldAudio.removeEventListener('play', oldListeners.handlePlay);
      oldAudio.removeEventListener('pause', oldListeners.handlePause);
      oldAudio.removeEventListener('ended', oldListeners.handleEnded);

      console.log("[Feedback] Cleaned up old audio listeners");
    }

    // NOW reset refs after cleanup is complete
    audioElementRef.current = audio;
    audioListenersRef.current = null;

    if (!audio) {
      // Update ref DIRECTLY before state to prevent race condition
      isPlaybackActiveRef.current = false;
      setIsPlaybackActive(false);
      return;
    }

    // Create stable listener references
    // NOTE: We update isPlaybackActiveRef DIRECTLY here to avoid race conditions
    // where MIDI events arrive between setState and the next render
    const handlePlay = () => {
      console.log("[Feedback] Audio play event - scoring enabled");
      isPlaybackActiveRef.current = true;  // Immediate sync for MIDI
      setIsPlaybackActive(true);
    };

    const handlePause = () => {
      console.log("[Feedback] Audio pause event - scoring disabled");
      // Disable scoring when paused - only score during actual playback
      isPlaybackActiveRef.current = false;  // Immediate sync for MIDI
      setIsPlaybackActive(false);
    };

    const handleEnded = () => {
      console.log("[Feedback] Audio ended");
      isPlaybackActiveRef.current = false;  // Immediate sync for MIDI
      setIsPlaybackActive(false);
    };

    // Store listener references for cleanup - create object FIRST so RAF can update it
    const listenersObj = {
      handlePlay,
      handlePause,
      handleEnded,
      rafId: null as number | null,
    };
    audioListenersRef.current = listenersObj;

    // High-frequency timing loop (60fps) for precise scoring
    // Updates the stored rafId on each frame so cleanup can cancel the correct one
    const updateTime = () => {
      if (audio) {
        currentTimeRef.current = audio.currentTime;
      }
      // Store new rafId in the shared object for proper cleanup
      listenersObj.rafId = requestAnimationFrame(updateTime);
    };
    listenersObj.rafId = requestAnimationFrame(updateTime);

    // Register listeners
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    // Sync initial state - update ref DIRECTLY for immediate MIDI response
    if (!audio.paused) {
      isPlaybackActiveRef.current = true;  // Immediate sync for MIDI
      setIsPlaybackActive(true);
      currentTimeRef.current = audio.currentTime;
      console.log(`[Feedback] Attached to playing audio at ${audio.currentTime.toFixed(2)}s`);
    } else {
      isPlaybackActiveRef.current = false;  // Immediate sync for MIDI
      setIsPlaybackActive(false);
      console.log("[Feedback] Attached to paused audio");
    }
  }, []);

  // Legacy API - kept for compatibility but now just updates ref
  // NOTE: Always sync BOTH ref AND state to prevent race condition with MIDI events
  const setCurrentTime = useCallback((time: number) => {
    currentTimeRef.current = time;
    // Always sync ref AND state together
    const shouldBeActive = time > 0;
    isPlaybackActiveRef.current = shouldBeActive;
    // Only call setState if value actually changes (avoid redundant renders)
    if (shouldBeActive !== isPlaybackActive) {
      setIsPlaybackActive(shouldBeActive);
    }
  }, [isPlaybackActive]);

  // Reset score
  const resetScore = useCallback(() => {
    setScore({ perfect: 0, good: 0, early: 0, late: 0, miss: 0, total: 0 });
    setHits([]);
    hitNotesRef.current.clear();
    isPlaybackActiveRef.current = false;  // Immediate sync for MIDI
    setIsPlaybackActive(false);
  }, []);

  // Set hit callback
  const onDrumHit = useCallback((cb: (lane: LaneKey, time: number) => void) => {
    onDrumHitRef.current = cb;
  }, []);

  return {
    inputMode,
    isCalibrating,
    calibratingDrum,
    calibrationStep,
    profiles,
    detectedDrum,
    midiDevices,
    selectedMidi,
    isListening,
    micError,
    hits,
    score,
    currentAmplitude,
    debugInfo,
    isPlaybackActive,
    aiReady,
    rejectionReason,

    initMidi,
    initMicrophone,
    stopMicrophone,
    startCalibration,
    cancelCalibration,
    saveCalibration,
    removeProfile,
    connectMidi,
    disconnectMidi,
    setNotesToTrack,
    setCurrentTime,
    attachAudioElement,
    resetScore,
    onDrumHit,
    handleDrumHit,
  };
}

// MIDI note to lane mapping
function midiNoteToLane(note: number): LaneKey | null {
  const mapping: Record<number, LaneKey> = {
    35: "kick", 36: "kick",
    38: "snare", 40: "snare",
    42: "hihat", 44: "hihat", 46: "hihat",
    48: "tom1", 50: "tom1",
    45: "tom2", 47: "tom2",
    41: "floor", 43: "floor",
    49: "crash", 55: "crash", 57: "crash",
    51: "ride", 53: "ride", 59: "ride",
  };
  return mapping[note] || null;
}

// Feedback Panel Component
interface FeedbackPanelProps {
  feedback: ReturnType<typeof useDrumFeedback>;
}

export function DrumFeedbackPanel({ feedback }: FeedbackPanelProps) {
  const {
    inputMode,
    isCalibrating,
    calibratingDrum,
    calibrationStep,
    profiles,
    detectedDrum,
    midiDevices,
    selectedMidi,
    isListening,
    micError,
    hits,
    score,
    currentAmplitude,
    aiReady,
    rejectionReason,
    isPlaybackActive,
    initMidi,
    initMicrophone,
    stopMicrophone,
    startCalibration,
    cancelCalibration,
    removeProfile,
    connectMidi,
    disconnectMidi,
    resetScore,
  } = feedback;

  const allDrums: LaneKey[] = ["kick", "snare", "hihat", "tom1", "tom2", "floor", "crash", "ride"];

  useEffect(() => {
    initMidi();
  }, [initMidi]);

  const recentHits = hits.slice(-5).reverse();
  const amplitudePercent = Math.min(currentAmplitude * 400, 100);

  return (
    <div className="df-panel">
      <style>{feedbackStyles}</style>

      <div className="df-header">
        <h3>Trumfeedback</h3>
        <div className="df-status">
          {inputMode === "midi" && isListening ? (
            isPlaybackActive ? (
              <span className="df-scoring">● Poängräkning aktiv</span>
            ) : (
              <span className="df-active">● MIDI Ansluten - tryck Spela</span>
            )
          ) : inputMode === "mic" && isListening ? (
            <span className="df-active">● Mikrofon ({profiles.length} konfigurerade)</span>
          ) : (
            <span className="df-inactive">○ Välj MIDI-enhet</span>
          )}
        </div>
      </div>

      {/* Debug info - shows what's happening */}
      <div className="df-debug" style={{ 
        fontSize: '11px', 
        background: 'rgba(0,0,0,0.3)', 
        padding: '8px', 
        borderRadius: '6px',
        marginBottom: '12px',
        fontFamily: 'monospace'
      }}>
        <div>MIDI: {selectedMidi ? '✓' : '✗'} | Listening: {isListening ? '✓' : '✗'} | Playback: {isPlaybackActive ? '✓' : '✗'}</div>
        {detectedDrum && <div style={{ color: '#4ade80' }}>Senast: {detectedDrum}</div>}
      </div>

      {/* MIDI is always shown first - it's the recommended method */}
      <div className="df-midi-setup">
        <h4>MIDI E-trumma (rekommenderas)</h4>
        {midiDevices.length === 0 ? (
          <p className="df-note">Inga MIDI-enheter hittades. Anslut din e-trumma via USB.</p>
        ) : (
          <div className="df-midi-list">
            {midiDevices.map(device => (
              <button
                key={device.id}
                className={`df-midi-device ${selectedMidi === device.id ? "selected" : ""}`}
                onClick={() => selectedMidi === device.id ? disconnectMidi() : connectMidi(device.id)}
                data-testid={`button-midi-device-${device.id}`}
              >
                {device.name}
                {selectedMidi === device.id && " ✓"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Calibration (Mic mode only) */}
      {inputMode === "mic" && (
        <div className="df-calibration">
          <div className="df-calib-header">
            <h4>Konfigurera trummor</h4>
            <span className="df-configured">{profiles.length}/8</span>
          </div>

          {isCalibrating && calibratingDrum ? (
            <div className="df-calib-active">
              <div className="df-calib-drum" style={{ background: DRUM_COLORS[calibratingDrum] }}>
                {DRUM_NAMES[calibratingDrum]}
              </div>
              <div className="df-calib-progress">
                <div className="df-calib-dots">
                  {[1, 2, 3, 4, 5].map(i => (
                    <span 
                      key={i} 
                      className={`df-calib-dot ${i <= calibrationStep ? "filled" : ""}`}
                    />
                  ))}
                </div>
                <p className="df-calib-instruction">
                  Slå på {DRUM_NAMES[calibratingDrum]} {5 - calibrationStep} gånger till
                </p>
                <p className="df-calib-note">
                  AI:n filtrerar bort röst, andning och andra ljud.
                  <br/>Endast {DRUM_NAMES[calibratingDrum]}-slag registreras.
                </p>
              </div>
              <button className="df-btn cancel" onClick={cancelCalibration}>
                ✕ Avbryt
              </button>
            </div>
          ) : (
            <>
              <p className="df-calib-info">
                Klicka på + och slå på trumman 5 gånger. AI:n känner redan igen trumljud och filtrerar bort annat.
              </p>
              <div className="df-drum-grid">
                {allDrums.map(drum => {
                  const profile = profiles.find(p => p.lane === drum);
                  return (
                    <div
                      key={drum}
                      className={`df-drum-item ${profile ? "configured" : ""} ${detectedDrum === drum ? "detected" : ""}`}
                      style={{ "--drum-color": DRUM_COLORS[drum] } as React.CSSProperties}
                    >
                      <div className="df-drum-icon">
                        {drum === "hihat" || drum === "crash" || drum === "ride" ? "○" : "●"}
                      </div>
                      <span className="df-drum-name">{DRUM_NAMES[drum]}</span>
                      {profile ? (
                        <button 
                          className="df-drum-action remove" 
                          onClick={() => removeProfile(drum)}
                          title="Ta bort"
                        >
                          ✕
                        </button>
                      ) : (
                        <button 
                          className="df-drum-action add"
                          onClick={() => startCalibration(drum)}
                          title="Konfigurera"
                        >
                          +
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Score */}
      <div className="df-score">
        <div className="df-score-header">
          <h4>Poäng</h4>
          <button className="df-reset" onClick={resetScore}>Nollställ</button>
        </div>
        <div className="df-score-grid">
          <div className="df-score-item perfect">
            <span className="df-score-label">Perfect</span>
            <span className="df-score-value">{score.perfect}</span>
          </div>
          <div className="df-score-item good">
            <span className="df-score-label">Good</span>
            <span className="df-score-value">{score.good}</span>
          </div>
          <div className="df-score-item early">
            <span className="df-score-label">Early</span>
            <span className="df-score-value">{score.early}</span>
          </div>
          <div className="df-score-item late">
            <span className="df-score-label">Late</span>
            <span className="df-score-value">{score.late}</span>
          </div>
          <div className="df-score-item miss">
            <span className="df-score-label">Miss</span>
            <span className="df-score-value">{score.miss}</span>
          </div>
        </div>
        <div className="df-total">
          Total: <strong>{score.total}</strong> poäng
        </div>
      </div>

      {/* Recent Hits */}
      {recentHits.length > 0 && (
        <div className="df-hits">
          <h4>Senaste träffar</h4>
          <div className="df-hits-list">
            {recentHits.map((hit, i) => (
              <div 
                key={i} 
                className={`df-hit ${hit.accuracy}`}
                style={{ "--drum-color": DRUM_COLORS[hit.lane] } as React.CSSProperties}
              >
                <span className="df-hit-drum">{DRUM_NAMES[hit.lane]}</span>
                <span className={`df-hit-acc ${hit.accuracy}`}>
                  {hit.accuracy === "perfect" ? "🎯" : 
                   hit.accuracy === "good" ? "✓" :
                   hit.accuracy === "early" ? "⏪" :
                   hit.accuracy === "late" ? "⏩" : "✕"}
                  {hit.accuracy}
                </span>
                {hit.points > 0 && <span className="df-hit-pts">+{hit.points}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detected Drum Overlay */}
      {detectedDrum && (
        <div 
          className="df-detected"
          style={{ background: DRUM_COLORS[detectedDrum] }}
        >
          {DRUM_NAMES[detectedDrum]}
        </div>
      )}
    </div>
  );
}

const feedbackStyles = `
... (resten av CSS:en oförändrad) ...
`;

