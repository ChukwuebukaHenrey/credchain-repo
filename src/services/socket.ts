// services/socket.ts
// Socket.io client — mirrors monorepo frontend/src/services/socket.js.
// The backend emits per-user events after the client joins its room:
//   chat:message, chat:room-opened, bulk:start, bulk:progress, bulk:complete
// Usage: connectSocket(userId) right after login; disconnectSocket() on logout.
import { io, Socket } from "socket.io-client";

// Socket connects directly to the backend origin (the Vite /api proxy only
// covers HTTP). Same default as the backend dev port.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
  }
  return socket;
}

export function connectSocket(userId: string): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
    // Join the per-user room — required to receive any targeted event.
    s.emit("join", userId);
    s.on("connect", () => s.emit("join", userId));
  }
  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
