/**
 * YamNet-based Drum Detection
 * 
 * Uses Google's YamNet model (521 audio classes) to classify drum sounds.
 * This provides reliable discrimination between drums and other sounds (voice, noise).
 * 
 * YamNet classes for drums (from yamnet_class_map.csv):
 * - 400: Drum
 * - 401: Drum kit
 * - 402: Snare drum
 * - 403: Rimshot
 * - 404: Drum roll
 * - 405: Bass drum
 * - 406: Timpani
 * - 407: Tabla
 * - 408: Cymbal
 * - 409: Hi-hat
 * - 410: Wood block
 * - 411: Tambourine
 * - 412: Rattle
 * - 413: Maraca
 * - 414: Gong
 * - 415: Tubular bells
 * - 416: Mallet percussion
 * - 417: Xylophone
 * - 418: Marimba
 * - 419: Vibraphone
 * - 420: Steelpan
 * - 421: Orchestra
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';

// Suppress TypeScript JSX errors - Vite handles React injection
declare const React: any;

export type DrumClass = 'kick' | 'snare' | 'hihat' | 'cymbal' | 'tom' | 'unknown' | 'not_drum';

export interface YamNetDetection {
  drumClass: DrumClass;
  confidence: number;
  allScores: { className: string; score: number }[];
  isDrum: boolean;
}

// YamNet class indices for drum-related sounds
const DRUM_CLASS_INDICES = {
  drum: 400,
  drumKit: 401,
  snareDrum: 402,
  rimshot: 403,
  drumRoll: 404,
  bassDrum: 405,
  timpani: 406,
  cymbal: 408,
  hihat: 409,
};

// Map YamNet classes to our drum types
const CLASS_TO_DRUM: Record<number, DrumClass> = {
  400: 'unknown',  // Generic drum
  401: 'unknown',  // Drum kit
  402: 'snare',    // Snare drum
  403: 'snare',    // Rimshot
  404: 'unknown',  // Drum roll
  405: 'kick',     // Bass drum
  406: 'tom',      // Timpani (similar to tom)
  408: 'cymbal',   // Cymbal
  409: 'hihat',    // Hi-hat
};

// Classes that indicate NOT a drum (for rejection)
const REJECTION_CLASSES = [
  0,   // Speech
  1,   // Child speech
  2,   // Conversation
  3,   // Narration
  4,   // Babbling
  5,   // Speech synthesizer
  6,   // Shout
  7,   // Bellow
  8,   // Whoop
  9,   // Yell
  10,  // Children shouting
  // ... more speech/voice classes
  23,  // Breathing
  24,  // Wheeze
  25,  // Snoring
  26,  // Gasp
  27,  // Pant
  28,  // Snort
  29,  // Cough
  30,  // Throat clearing
  31,  // Sneeze
  32,  // Sniff
  33,  // Run
  34,  // Shuffle
  35,  // Walk, footsteps
  36,  // Chewing, mastication
  37,  // Biting
  38,  // Gargling
  39,  // Stomach rumble
  40,  // Burping, eructation
  41,  // Hiccup
  // Silence/background
  494, // Silence
  495, // White noise
  496, // Pink noise
];

export function useYamNetDetector() {
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [lastDetection, setLastDetection] = useState<YamNetDetection | null>(null);
  
  const modelRef = useRef<tf.GraphModel | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const classNamesRef = useRef<string[]>([]);
  const processingRef = useRef(false);
  const onDetectionRef = useRef<((detection: YamNetDetection) => void) | null>(null);

  // Load YamNet model and class names
  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // First ensure TF.js is ready
        await tf.ready();
        console.log('TensorFlow.js ready, backend:', tf.getBackend());
        
        // Load class names
        try {
          const classMapUrl = 'https://raw.githubusercontent.com/tensorflow/models/master/research/audioset/yamnet/yamnet_class_map.csv';
          const response = await fetch(classMapUrl);
          const csv = await response.text();
          classNamesRef.current = csv.split('\n')
            .slice(1) // Skip header
            .map(row => {
              const parts = row.split(',');
              return parts.length >= 3 ? parts[2]?.replace(/"/g, '').trim() : '';
            })
            .filter(name => name);
          console.log(`Loaded ${classNamesRef.current.length} class names`);
        } catch (e) {
          console.warn('Could not load class names, using indices', e);
        }
        
        // Load YamNet model from TFHub
        console.log('Loading YamNet model...');
        const modelUrl = 'https://tfhub.dev/google/tfjs-model/yamnet/tfjs/1';
        const model = await tf.loadGraphModel(modelUrl, { fromTFHub: true });
        modelRef.current = model;
        
        console.log('YamNet model loaded successfully');
        setIsReady(true);
        setIsLoading(false);
        
      } catch (err: any) {
        console.error('Failed to load YamNet:', err);
        setError(err.message || 'Kunde inte ladda AI-modellen');
        setIsLoading(false);
      }
    };
    
    loadModel();
    
    return () => {
      if (modelRef.current) {
        modelRef.current.dispose();
      }
    };
  }, []);

  // Process audio and classify
  const classifyAudio = useCallback(async (audioData: Float32Array): Promise<YamNetDetection | null> => {
    if (!modelRef.current || processingRef.current) return null;
    
    processingRef.current = true;
    
    try {
      // YamNet expects 16kHz mono audio
      // Our input may be at different sample rate, so we need to handle that
      
      // Create tensor from audio data
      const waveform = tf.tensor1d(audioData);
      
      // Run inference
      // YamNet returns [scores, embeddings, spectrogram]
      const outputs = modelRef.current.predict(waveform) as tf.Tensor[];
      
      // Get scores tensor (shape: [frames, 521])
      const scoresTensor = outputs[0];
      const scoresData = await scoresTensor.data();
      
      // Average across time frames to get per-class scores
      const numClasses = 521;
      const numFrames = scoresData.length / numClasses;
      
      const avgScores = new Float32Array(numClasses);
      for (let c = 0; c < numClasses; c++) {
        let sum = 0;
        for (let f = 0; f < numFrames; f++) {
          sum += scoresData[f * numClasses + c];
        }
        avgScores[c] = sum / numFrames;
      }
      
      // Find top classes
      const indexed = Array.from(avgScores).map((score, idx) => ({ idx, score }));
      indexed.sort((a, b) => b.score - a.score);
      const top10 = indexed.slice(0, 10);
      
      // Check if any rejection class is in top 3 with high confidence
      const isRejected = top10.slice(0, 3).some(
        item => REJECTION_CLASSES.includes(item.idx) && item.score > 0.3
      );
      
      // Find best drum class
      let bestDrumClass: DrumClass = 'not_drum';
      let bestDrumScore = 0;
      
      for (const [classIdx, drumType] of Object.entries(CLASS_TO_DRUM)) {
        const idx = parseInt(classIdx);
        const score = avgScores[idx] || 0;
        if (score > bestDrumScore) {
          bestDrumScore = score;
          bestDrumClass = drumType;
        }
      }
      
      // Determine if this is a drum
      const isDrum = !isRejected && bestDrumScore > 0.15;
      
      // Build result
      const allScores = top10.map(item => ({
        className: classNamesRef.current[item.idx] || `Class ${item.idx}`,
        score: item.score,
      }));
      
      // Cleanup tensors
      waveform.dispose();
      outputs.forEach(t => t.dispose());
      
      const detection: YamNetDetection = {
        drumClass: isDrum ? bestDrumClass : 'not_drum',
        confidence: isDrum ? bestDrumScore : 0,
        allScores,
        isDrum,
      };
      
      return detection;
      
    } catch (err) {
      console.error('Classification error:', err);
      return null;
    } finally {
      processingRef.current = false;
    }
  }, []);

  // Start listening to microphone
  const startListening = useCallback(async () => {
    if (!isReady) {
      setError('Modellen är inte laddad än');
      return;
    }
    
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000, // YamNet expects 16kHz
          channelCount: 1,   // Mono
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });
      
      micStreamRef.current = stream;
      
      // Create audio context at 16kHz for YamNet
      const ctx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = ctx;
      
      const source = ctx.createMediaStreamSource(stream);
      
      // Create script processor to capture audio frames
      // We need about 1 second of audio (16000 samples) for YamNet
      const bufferSize = 16384; // ~1 second at 16kHz
      const scriptNode = ctx.createScriptProcessor(bufferSize, 1, 1);
      
      let audioBuffer: Float32Array[] = [];
      let sampleCount = 0;
      const targetSamples = 16000; // 1 second of audio
      
      scriptNode.onaudioprocess = async (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        
        // Accumulate samples
        audioBuffer.push(new Float32Array(inputData));
        sampleCount += inputData.length;
        
        // When we have enough samples, classify
        if (sampleCount >= targetSamples && !processingRef.current) {
          // Combine buffers
          const combined = new Float32Array(sampleCount);
          let offset = 0;
          for (const buf of audioBuffer) {
            combined.set(buf, offset);
            offset += buf.length;
          }
          
          // Reset buffer
          audioBuffer = [];
          sampleCount = 0;
          
          // Check if there's significant audio (not just silence)
          let maxAmp = 0;
          for (let i = 0; i < combined.length; i++) {
            maxAmp = Math.max(maxAmp, Math.abs(combined[i]));
          }
          
          // Only classify if amplitude is significant
          if (maxAmp > 0.05) {
            const detection = await classifyAudio(combined);
            if (detection) {
              setLastDetection(detection);
              if (detection.isDrum && onDetectionRef.current) {
                onDetectionRef.current(detection);
              }
            }
          }
        }
      };
      
      source.connect(scriptNode);
      scriptNode.connect(ctx.destination);
      
      setIsListening(true);
      setError(null);
      
    } catch (err: any) {
      console.error('Microphone error:', err);
      setError(err.message || 'Kunde inte starta mikrofonen');
    }
  }, [isReady, classifyAudio]);

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
    setIsListening(false);
  }, []);

  // Set detection callback
  const onDetection = useCallback((callback: (detection: YamNetDetection) => void) => {
    onDetectionRef.current = callback;
  }, []);

  return {
    isLoading,
    isReady,
    error,
    isListening,
    lastDetection,
    startListening,
    stopListening,
    onDetection,
    classifyAudio,
  };
}

// UI Component for YamNet detection status
interface YamNetStatusProps {
  detector: ReturnType<typeof useYamNetDetector>;
}

export function YamNetStatus({ detector }: YamNetStatusProps) {
  const { isLoading, isReady, error, isListening, lastDetection, startListening, stopListening } = detector;
  
  return (
    <div className="yamnet-status">
      <style>{yamnetStyles}</style>
      
      <div className="yamnet-header">
        <h4>🤖 YamNet AI</h4>
        <span className={`yamnet-badge ${isReady ? 'ready' : isLoading ? 'loading' : 'error'}`}>
          {isLoading ? 'Laddar modell...' : isReady ? 'Redo' : 'Fel'}
        </span>
      </div>
      
      {error && <div className="yamnet-error">{error}</div>}
      
      {isReady && (
        <button 
          className={`yamnet-btn ${isListening ? 'active' : ''}`}
          onClick={() => isListening ? stopListening() : startListening()}
        >
          {isListening ? '⏹ Stoppa' : '▶ Starta AI-detektion'}
        </button>
      )}
      
      {lastDetection && (
        <div className="yamnet-detection">
          <div className={`yamnet-result ${lastDetection.isDrum ? 'drum' : 'not-drum'}`}>
            {lastDetection.isDrum ? (
              <>
                🥁 {lastDetection.drumClass.toUpperCase()}
                <span className="confidence">{(lastDetection.confidence * 100).toFixed(0)}%</span>
              </>
            ) : (
              '❌ Inte trumljud'
            )}
          </div>
          <div className="yamnet-classes">
            {lastDetection.allScores.slice(0, 5).map((item, i) => (
              <div key={i} className="yamnet-class">
                <span className="class-name">{item.className}</span>
                <span className="class-score">{(item.score * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const yamnetStyles = `
.yamnet-status {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.yamnet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.yamnet-header h4 {
  margin: 0;
  font-size: 14px;
  color: #e2e8f0;
}

.yamnet-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
}

.yamnet-badge.ready {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.yamnet-badge.loading {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}

.yamnet-badge.error {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.yamnet-error {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  padding: 8px;
  border-radius: 6px;
  font-size: 12px;
  margin-bottom: 10px;
}

.yamnet-btn {
  width: 100%;
  padding: 10px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.yamnet-btn:hover {
  background: rgba(59, 130, 246, 0.25);
}

.yamnet-btn.active {
  background: rgba(74, 222, 128, 0.2);
  border-color: rgba(74, 222, 128, 0.3);
  color: #4ade80;
}

.yamnet-detection {
  margin-top: 10px;
}

.yamnet-result {
  padding: 10px;
  border-radius: 6px;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}

.yamnet-result.drum {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.yamnet-result.not-drum {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

.yamnet-result .confidence {
  margin-left: 8px;
  font-size: 12px;
  opacity: 0.7;
}

.yamnet-classes {
  font-size: 11px;
  color: #94a3b8;
}

.yamnet-class {
  display: flex;
  justify-content: space-between;
  padding: 2px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.yamnet-class:last-child {
  border-bottom: none;
}

.class-name {
  color: #94a3b8;
}

.class-score {
  color: #64748b;
}
`;
