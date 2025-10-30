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
      // CRITICAL: Proxy ALL API requests to backend
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('PROXYING API REQUEST:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('PROXYING API RESPONSE:', proxyRes.statusCode, req.url);
          });
        }
      },
      // CRITICAL: Proxy WebSocket connections to backend
      '/ws': {
        target: 'ws://localhost:5000',
        ws: true,
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
            console.log('PROXYING WS CONNECTION:', req.url);
          });
        }
      },
    },
  },
});
