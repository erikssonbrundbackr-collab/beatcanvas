import { useEffect, useRef, useState } from "react";

type Props = { analyser: AnalyserNode | null; width?: number; height?: number };

export default function BeatVisualizer({ analyser, width = 480, height = 270 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !analyser) return;

    const fft = new Uint8Array(analyser.frequencyBinCount);
    const energyHistory: number[] = [];
    const HISTORY = 43; // ~1s på 43 FPS-ish
    let raf = 0;

    const draw = () => {
      analyser.getByteFrequencyData(fft);

      // Energi = medel på 40-2000 Hz ungefär (skip de lägsta/highest bins)
      const start = Math.floor(fft.length * 0.05);
      const end = Math.floor(fft.length * 0.65);
      let sum = 0;
      for (let i = start; i < end; i++) sum += fft[i];
      const energy = sum / (end - start); // 0..255

      energyHistory.push(energy);
      if (energyHistory.length > HISTORY) energyHistory.shift();
      const avg = energyHistory.reduce((a, b) => a + b, 0) / energyHistory.length;
      const variance = energyHistory.reduce((a, b) => a + (b - avg) * (b - avg), 0) / energyHistory.length;
      const stdev = Math.sqrt(variance);
      const threshold = avg + stdev * 1.5; // adaptiv tröskel

      const isBeat = energy > threshold;
      setActive(isBeat);

      // RITNING
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Rita barer
      const barW = canvas.width / (end - start);
      for (let i = start; i < end; i++) {
        const v = fft[i] / 255;
        const h = v * (canvas.height - 60);
        ctx.fillStyle = isBeat ? "#ef4444" : "#3b82f6";
        ctx.fillRect((i - start) * barW, canvas.height - h - 60, barW, h);
      }

      // Beat-cirkel
      const r = isBeat ? 50 : 20;
      ctx.beginPath();
      ctx.fillStyle = isBeat ? "#ef4444" : "#10b981";
      ctx.arc(canvas.width / 2, canvas.height / 2, r, 0, Math.PI * 2);
      ctx.fill();

      // Text
      ctx.fillStyle = "#ddd";
      ctx.font = "12px Inter, system-ui, sans-serif";
      ctx.fillText(isBeat ? "BEAT!" : "—", 10, 16);
      ctx.fillText(`E=${energy.toFixed(0)}  μ=${avg.toFixed(0)}  σ=${stdev.toFixed(1)}`, 10, 32);

      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [analyser]);

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width,
          height,
          border: "1px solid #333",
          borderRadius: 8,
          background: active ? "#111" : "#000",
        }}
      />
      <div style={{ fontSize: 12, color: "#888", marginTop: 6 }}>
        Cirkeln blinkar vid upptäckta beats (Web Audio – ingen Spotify analysis).
      </div>
    </div>
  );
}
