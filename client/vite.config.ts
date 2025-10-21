import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "..", "shared"),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: true,
    port: 3000,
    proxy: {
      // Proxy API requests to backend
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
      // Proxy WebSocket connections to backend
      '/ws': {
        target: 'ws://127.0.0.1:5000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
