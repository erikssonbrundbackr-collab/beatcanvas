// src/socket.ts
import { io, Socket } from "socket.io-client";

// 🌍 Anslut alltid till samma origin som frontend (Vite på 3000 / Replit-URL)
// Vite proxy skickar vidare /socket.io till Node-servern (t.ex. port 4000).
const URL =
  typeof window !== "undefined"
    ? window.location.origin // t.ex. https://...replit.dev (ingen :3001!)
    : "http://localhost:3000";

console.log("[socket] connecting to", URL);

export const socket: Socket = io(URL, {
  path: "/socket.io",      // standard Socket.io-path
  transports: ["websocket"]
});

// 🔍 Lite debug-loggar (hjälper oss att se status)
socket.on("connect", () => {
  console.log("[socket] connected ✅", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("[socket] connect_error:", err.message);
});
