// ─────────────────────────────────────────────────────────────
// CredChain Backend — entry point
// Express HTTP server + Socket.io realtime layer + MongoDB (Mongoose)
// Listens on http://localhost:5000
// ─────────────────────────────────────────────────────────────

require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const apiRoutes = require('./routes/api');

// ── Configuration ────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/credchain';

// ── Express app ──────────────────────────────────────────────
const app = express();

// CORS: explicitly allow ONLY the frontend origin (http://localhost:3000).
const corsOptions = {
  origin: CLIENT_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Lightweight request logger (handy during development).
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ── Health check ─────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.status(200).json({
    service: 'credchain-backend',
    status: 'ok',
    port: PORT,
    time: new Date().toISOString(),
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// ── API routes ───────────────────────────────────────────────
app.use('/api', apiRoutes);

// 404 fallback for unknown routes.
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Centralised error handler.
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// ── HTTP server + Socket.io ──────────────────────────────────
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make the io instance available to routes/controllers via app locals.
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`[socket] client connected: ${socket.id}`);

  // Join a per-user room so we can target direct messages.
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(String(userId));
      console.log(`[socket] ${socket.id} joined room ${userId}`);
    }
  });

  // Realtime chat relay.
  socket.on('chat:message', (payload) => {
    const { to } = payload || {};
    if (to) {
      io.to(String(to)).emit('chat:message', payload);
    } else {
      socket.broadcast.emit('chat:message', payload);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`[socket] client disconnected: ${socket.id} (${reason})`);
  });
});

// ── Boot ─────────────────────────────────────────────────────
async function start() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`[mongo] connected to ${MONGO_URI}`);
  } catch (err) {
    // Do not crash the dev server if Mongo is offline — log and continue
    // so the API/proxy/socket layers remain testable.
    console.error('[mongo] connection failed:', err.message);
  }

  server.listen(PORT, () => {
    console.log('────────────────────────────────────────────');
    console.log(` CredChain backend running`);
    console.log(` → http://localhost:${PORT}`);
    console.log(` → CORS allowed origin: ${CLIENT_ORIGIN}`);
    console.log('────────────────────────────────────────────');
  });
}

start();

// Graceful shutdown.
process.on('SIGINT', async () => {
  console.log('\n[shutdown] closing server...');
  await mongoose.connection.close().catch(() => {});
  server.close(() => process.exit(0));
});

module.exports = { app, server, io };
