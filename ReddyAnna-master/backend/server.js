import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { initializeWebSocket } from './src/websocket.js';
import authRouter from './src/routes/auth.js';
import gameSettingsRouter from './src/routes/gameSettings.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4001;

// Simple middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple health check
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Simple route registration
app.use('/api/auth', authRouter);
app.use('/api/game', gameSettingsRouter);

// Simple error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

// Create HTTP server
const server = createServer(app);

// Simple server startup
server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
  
  // Initialize WebSocket server
  initializeWebSocket(server);
  console.log(`WebSocket server listening on ws://localhost:${port}`);
});


