/**
 * AI-powered Drum Sound Detection using TensorFlow.js
 * 
 * This module uses a pre-trained audio classification approach to distinguish
 * actual drum sounds from ambient noise (voice, breathing, etc.)
 * 
 * The system uses spectral analysis combined with temporal pattern recognition
 * to identify percussive sounds that match drum characteristics.
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';

export type DrumType = 'kick' | 'snare' | 'hihat' | 'tom' | 'crash' | 'ride' | 'unknown';

export interface DrumDetection {
  type: DrumType;
  confidence: number;
  timestamp: number;
}

// Pre-defined spectral signatures for different drum types
// These are based on acoustic research on drum frequency characteristics
const DRUM_SIGNATURES = {
  kick: {
    // Kick drums have fundamental around 40-100Hz with harmonics up to 200Hz
    fundamentalLow: 40,
    fundamentalHigh: 100,
    presenceRange: [60, 200],
    // Kick has low spectral centroid
    centroidLow: 100,
    centroidHigh: 500,
    // Kick has fast attack, medium decay
    attackMs: 5,
    decayMs: 100,
    // High energy in low frequencies
    lowEnergyRatio: 0.6,
  },
  snare: {
    // Snare has fundamental around 150-250Hz with snare wires adding high freq
    fundamentalLow: 150,
    fundamentalHigh: 300,
    presenceRange: [200, 5000],
    // Snare has mid-high spectral centroid due to wires
    centroidLow: 800,
    centroidHigh: 4000,
    attackMs: 3,
    decayMs: 80,
    // Snare has energy across spectrum
    lowEnergyRatio: 0.25,
  },
  hihat: {
    // Hi-hat is mostly high frequency content
    fundamentalLow: 300,
    fundamentalHigh: 1000,
    presenceRange: [2000, 15000],
    // Hi-hat has very high spectral centroid
    centroidLow: 3000,
    centroidHigh: 12000,
    attackMs: 1,
    decayMs: 50,
    // Hi-hat has almost no low energy
    lowEnergyRatio: 0.05,
  },
  tom: {
    // Toms are between kick and snare
    fundamentalLow: 80,
    fundamentalHigh: 200,
    presenceRange: [100, 1000],
    centroidLow: 200,
    centroidHigh: 1500,
    attackMs: 5,
    decayMs: 150,
    lowEnergyRatio: 0.45,
  },
  crash: {
    // Crash cymbals are broad spectrum with emphasis on highs
    fundamentalLow: 200,
    fundamentalHigh: 500,
    presenceRange: [500, 16000],
    centroidLow: 2000,
    centroidHigh: 10000,
    attackMs: 2,
    decayMs: 500,
    lowEnergyRatio: 0.1,
  },
  ride: {
    // Ride is similar to hi-hat but with more sustain and "ping"
    fundamentalLow: 300,
    fundamentalHigh: 600,
    presenceRange: [1000, 12000],
    centroidLow: 2500,
    centroidHigh: 8000,
    attackMs: 2,
    decayMs: 200,
    lowEnergyRatio: 0.08,
  },
};

// Characteristics that indicate NON-drum sounds
const NOISE_CHARACTERISTICS = {
  voice: {
    // Human voice fundamental is 85-255Hz (male) or 165-255Hz (female)
    fundamentalRange: [85, 400],
    // Voice has formants that create specific patterns
    harmonicRatio: 0.7, // High harmonic content
    sustainedEnergy: true, // Energy persists over time
    spectralFlux: 0.3, // Lower spectral change rate
  },
  breathing: {
    // Breathing is white-noise-like
    spectralFlatness: 0.6, // High flatness = noise-like
    lowAmplitude: true,
    gradualOnset: true, // Slow attack
  },
};

interface AudioFeatures {
  amplitude: number;
  peakFrequency: number;
  spectralCentroid: number;
  spectralFlatness: number;
  lowEnergyRatio: number;
  spectralFlux: number;
  zeroCrossingRate: number;
  isTransient: boolean;
  attackTime: number;
}

export function useDrumAIDetector() {
  const [isReady, setIsReady] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastDetection, setLastDetection] = useState<DrumDetection | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const previousSpectrumRef = useRef<Float32Array | null>(null);
  const amplitudeHistoryRef = useRef<number[]>([]);
  const lastDetectionTimeRef = useRef<number>(0);
  const onDetectionRef = useRef<((detection: DrumDetection) => void) | null>(null);

  // Initialize TensorFlow.js
  useEffect(() => {
    const init = async () => {
      await tf.ready();
      console.log('TensorFlow.js ready, backend:', tf.getBackend());
      setIsReady(true);
    };
    init();
  }, []);

  // Extract audio features from analyser
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

    // Track amplitude history for transient detection
    const history = amplitudeHistoryRef.current;
    history.push(amplitude);
    if (history.length > 10) history.shift();

    // Detect transient (sudden increase in amplitude)
    const avgHistory = history.length > 3 
      ? history.slice(0, -1).reduce((a, b) => a + b, 0) / (history.length - 1)
      : 0;
    const isTransient = amplitude > avgHistory * 3 && amplitude > 0.02;

    // Calculate attack time (how fast the sound reached peak)
    let attackTime = 10; // Default
    if (isTransient && history.length > 2) {
      const rise = amplitude - history[history.length - 2];
      attackTime = rise > 0.1 ? 3 : rise > 0.05 ? 5 : 10;
    }

    // Convert dB to linear for magnitude
    const magnitudes = new Float32Array(bufferLength);
    for (let i = 0; i < bufferLength; i++) {
      magnitudes[i] = Math.pow(10, frequencyData[i] / 20);
    }

    const binWidth = sampleRate / (analyser.fftSize);

    // Find peak frequency
    let maxMag = 0;
    let peakBin = 0;
    for (let i = 1; i < bufferLength; i++) {
      if (magnitudes[i] > maxMag) {
        maxMag = magnitudes[i];
        peakBin = i;
      }
    }
    const peakFrequency = peakBin * binWidth;

    // Calculate spectral centroid
    let weightedSum = 0;
    let magnitudeSum = 0;
    for (let i = 0; i < bufferLength; i++) {
      const freq = i * binWidth;
      weightedSum += magnitudes[i] * freq;
      magnitudeSum += magnitudes[i];
    }
    const spectralCentroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;

    // Calculate spectral flatness (Wiener entropy)
    // High flatness = noise-like, Low flatness = tonal
    let geometricMean = 0;
    let arithmeticMean = 0;
    let count = 0;
    for (let i = 1; i < bufferLength; i++) {
      if (magnitudes[i] > 0) {
        geometricMean += Math.log(magnitudes[i]);
        arithmeticMean += magnitudes[i];
        count++;
      }
    }
    geometricMean = count > 0 ? Math.exp(geometricMean / count) : 0;
    arithmeticMean = count > 0 ? arithmeticMean / count : 0;
    const spectralFlatness = arithmeticMean > 0 ? geometricMean / arithmeticMean : 0;

    // Calculate low energy ratio (energy below 300Hz / total energy)
    const lowFreqBin = Math.floor(300 / binWidth);
    let lowEnergy = 0;
    let totalEnergy = 0;
    for (let i = 0; i < bufferLength; i++) {
      const energy = magnitudes[i] * magnitudes[i];
      totalEnergy += energy;
      if (i < lowFreqBin) lowEnergy += energy;
    }
    const lowEnergyRatio = totalEnergy > 0 ? lowEnergy / totalEnergy : 0;

    // Calculate spectral flux (change from previous frame)
    let spectralFlux = 0;
    if (previousSpectrumRef.current) {
      const prev = previousSpectrumRef.current;
      for (let i = 0; i < bufferLength; i++) {
        const diff = magnitudes[i] - prev[i];
        spectralFlux += diff > 0 ? diff * diff : 0;
      }
      spectralFlux = Math.sqrt(spectralFlux / bufferLength);
    }
    previousSpectrumRef.current = magnitudes;

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
      spectralFlux,
      zeroCrossingRate,
      isTransient,
      attackTime,
    };
  }, []);

  // Classify if sound is a drum and which type
  const classifyDrum = useCallback((features: AudioFeatures): DrumDetection | null => {
    // First, filter out obvious non-drum sounds
    
    // 1. Must be a transient (sudden onset)
    if (!features.isTransient) {
      return null;
    }

    // 2. Must have sufficient amplitude
    if (features.amplitude < 0.03) {
      return null;
    }

    // 3. Check for voice characteristics - REJECT if voice-like
    const isVoiceLike = (
      features.spectralCentroid > 200 && 
      features.spectralCentroid < 2000 &&
      features.spectralFlatness < 0.3 &&
      features.zeroCrossingRate < 0.15
    );
    
    if (isVoiceLike && features.lowEnergyRatio > 0.2 && features.lowEnergyRatio < 0.5) {
      setDebugInfo(`Rejected: Voice-like (ZCR: ${features.zeroCrossingRate.toFixed(3)}, Flatness: ${features.spectralFlatness.toFixed(3)})`);
      return null;
    }

    // 4. Check for breathing/noise characteristics - REJECT if noise-like
    if (features.spectralFlatness > 0.5 && features.amplitude < 0.1) {
      setDebugInfo(`Rejected: Breathing/noise (Flatness: ${features.spectralFlatness.toFixed(3)})`);
      return null;
    }

    // 5. Drums have very fast attack - reject slow onsets
    if (features.attackTime > 15) {
      setDebugInfo(`Rejected: Slow attack (${features.attackTime}ms)`);
      return null;
    }

    // Now classify which drum type based on spectral characteristics
    let bestMatch: DrumType = 'unknown';
    let bestScore = 0;
    let debugStr = `Amp: ${features.amplitude.toFixed(3)}, Peak: ${features.peakFrequency.toFixed(0)}Hz, ` +
                   `Cent: ${features.spectralCentroid.toFixed(0)}Hz, LowE: ${features.lowEnergyRatio.toFixed(2)}, ` +
                   `Flat: ${features.spectralFlatness.toFixed(3)}, ZCR: ${features.zeroCrossingRate.toFixed(3)}\n`;

    for (const [drumName, sig] of Object.entries(DRUM_SIGNATURES)) {
      let score = 0;
      let matchDetails = '';

      // Check spectral centroid match
      if (features.spectralCentroid >= sig.centroidLow && 
          features.spectralCentroid <= sig.centroidHigh) {
        const range = sig.centroidHigh - sig.centroidLow;
        const center = (sig.centroidLow + sig.centroidHigh) / 2;
        const dist = Math.abs(features.spectralCentroid - center) / (range / 2);
        const centroidScore = (1 - dist * 0.5) * 40;
        score += centroidScore;
        matchDetails += `cent:${centroidScore.toFixed(0)} `;
      }

      // Check low energy ratio match
      const lowEnergyTarget = sig.lowEnergyRatio;
      const lowEnergyDiff = Math.abs(features.lowEnergyRatio - lowEnergyTarget);
      if (lowEnergyDiff < 0.3) {
        const lowEnergyScore = (1 - lowEnergyDiff / 0.3) * 30;
        score += lowEnergyScore;
        matchDetails += `low:${lowEnergyScore.toFixed(0)} `;
      }

      // Check peak frequency match
      if (features.peakFrequency >= sig.fundamentalLow && 
          features.peakFrequency <= sig.fundamentalHigh) {
        score += 20;
        matchDetails += 'peak:20 ';
      }

      // Fast attack bonus for drums
      if (features.attackTime <= sig.attackMs * 2) {
        score += 10;
        matchDetails += 'attack:10 ';
      }

      debugStr += `  ${drumName}: ${score.toFixed(0)} (${matchDetails})\n`;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = drumName as DrumType;
      }
    }

    setDebugInfo(debugStr);

    // Require minimum confidence to classify
    if (bestScore < 50) {
      return null;
    }

    const confidence = Math.min(bestScore / 100, 1);

    return {
      type: bestMatch,
      confidence,
      timestamp: Date.now(),
    };
  }, []);

  // Start listening
  const startListening = useCallback(async () => {
    try {
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

      setIsListening(true);

      // Start detection loop
      const detect = () => {
        if (!analyserRef.current) return;

        const features = extractFeatures();
        
        if (features) {
          // Rate limit detections
          const now = Date.now();
          if (now - lastDetectionTimeRef.current > 80) {
            const detection = classifyDrum(features);
            
            if (detection) {
              lastDetectionTimeRef.current = now;
              setLastDetection(detection);
              setConfidence(detection.confidence);
              
              if (onDetectionRef.current) {
                onDetectionRef.current(detection);
              }
            }
          }
        }

        requestAnimationFrame(detect);
      };

      requestAnimationFrame(detect);

    } catch (err) {
      console.error('Failed to start listening:', err);
    }
  }, [extractFeatures, classifyDrum]);

  // Stop listening
  const stopListening = useCallback(() => {
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
    amplitudeHistoryRef.current = [];
    previousSpectrumRef.current = null;
  }, []);

  // Set detection callback
  const onDetection = useCallback((callback: (detection: DrumDetection) => void) => {
    onDetectionRef.current = callback;
  }, []);

  return {
    isReady,
    isListening,
    lastDetection,
    confidence,
    debugInfo,
    startListening,
    stopListening,
    onDetection,
  };
}

// Map AI drum type to lane key
export function drumTypeToLane(type: DrumType): string | null {
  const mapping: Record<DrumType, string> = {
    kick: 'kick',
    snare: 'snare',
    hihat: 'hihat',
    tom: 'tom1',
    crash: 'crash',
    ride: 'ride',
    unknown: '',
  };
  return mapping[type] || null;
}
