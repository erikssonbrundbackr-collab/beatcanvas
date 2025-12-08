import { useEffect, useRef, useState } from "react";

export default function AudioVisualizer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ctx, setCtx] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;
    const audioCtx = new AudioContext();
    const src = audioCtx.createMediaElementSource(audioRef.current);
    const analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 2048;
    src.connect(analyserNode);
    analyserNode.connect(audioCtx.destination);
    setCtx(audioCtx);
    setAnalyser(analyserNode);
  }, []);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const c = canvas.getContext("2d");
    const data = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      if (!c) return;
      analyser.getByteTimeDomainData(data);
      c.fillStyle = "#000";
      c.fillRect(0, 0, canvas.width, canvas.height);
      c.strokeStyle = "#ff0000";
      c.beginPath();
      const slice = canvas.width / data.length;
      data.forEach((v, i) => {
        const y = (v / 255.0) * canvas.height;
        if (i === 0) c.moveTo(0, y);
        else c.lineTo(i * slice, y);
      });
      c.stroke();
      requestAnimationFrame(draw);
    };
    draw();
  }, [analyser]);

  return (
    <div style={{ textAlign: "center" }}>
      <audio
        ref={audioRef}
        controls
        src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
        style={{ width: "100%" }}
      />
      <canvas ref={canvasRef} width={600} height={200} style={{ background: "#000", marginTop: 10 }} />
      <p style={{ fontSize: 12, color: "#555" }}>Vågen ritas i realtid – du kan byta ut ljudfilen.</p>
    </div>
  );
}
