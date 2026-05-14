import { io } from "socket.io-client";

const isProduction = import.meta.env.PROD;

// In production, connect to the exact same origin since it's served by Nginx.
// In development, connect to the dev server port.
const SERVER_URL = isProduction
  ? window.location.origin
  : "http://localhost:3001";

// Create a single socket instance
export const socket = io(SERVER_URL, {
  autoConnect: false, // Don't connect until we have a user/lab context
  transports: ["websocket"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity,
});
