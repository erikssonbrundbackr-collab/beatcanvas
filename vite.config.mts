// vite.config.mts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "0.0.0.0",
      // din Replit-domän
      "692de4d5-1566-47b2-a38c-a8cec282e353-00-3o9q6ubmckoel.kirk.replit.dev",
    ],
    proxy: {
      "/api/ai": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
      },
      "/socket.io": {
        target: "http://localhost:4000",
        changeOrigin: true,
        ws: true,
      },
    },
    watch: {
      usePolling: true,
      interval: 100,
    },
  },
});
