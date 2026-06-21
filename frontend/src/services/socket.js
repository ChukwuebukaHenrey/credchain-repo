// ─────────────────────────────────────────────────────────────
// CredChain Frontend — Socket.io client
// Single shared client instance pointing at the backend (port 5000).
// ─────────────────────────────────────────────────────────────

import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// autoConnect is disabled so the app controls connection lifecycle
// (e.g. connect after login, disconnect on unmount).
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  withCredentials: true,
});

// Helpers for the common patterns.
export function connectSocket(userId) {
  if (!socket.connected) {
    socket.connect();
  }
  if (userId) {
    socket.emit('join', userId);
  }
  return socket;
}

export function disconnectSocket() {
  if (socket.connected) {
    socket.disconnect();
  }
}

export default socket;
