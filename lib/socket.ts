import { io, Socket } from 'socket.io-client';
import { secureStorage } from './storage';
import { API_BASE_URL } from './api';

/**
 * Single authenticated Socket.IO connection shared across the app.
 *
 * The realtime server is attached to the same host as the REST API, so we reach
 * it by stripping the trailing `/api` from the REST base URL. The connection
 * authenticates with the same JWT used for REST (sent in the handshake `auth`),
 * and the server places this tenant in a private `tenant:<userId>` room.
 *
 * Consumers acquire/release: the socket opens while at least one consumer needs
 * it and disconnects once the last one releases. Callers must treat realtime
 * events only as a nudge to re-check authoritative REST endpoints — never as the
 * source of truth for money.
 */

// e.g. https://api.verit.tech/api -> https://api.verit.tech
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, '');

let socket: Socket | null = null;
let refCount = 0;
// In-flight first connect, so concurrent acquirers share one socket instead of
// each racing to call io().
let connecting: Promise<Socket> | null = null;

/** Open (or reuse) the shared socket and register interest in it. */
export async function acquireSocket(): Promise<Socket> {
  refCount += 1;
  if (socket) return socket;
  if (connecting) return connecting;

  connecting = (async () => {
    const token = await secureStorage.getToken();
    if (!token) throw new Error('Cannot open socket: no authentication token');
    const s = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket'], // RN has no XHR long-polling; go straight to WS
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });
    socket = s;
    return s;
  })();

  try {
    return await connecting;
  } finally {
    // Cleared on both success and failure: on failure `socket` stays null so the
    // next acquire retries; on success subsequent acquires hit the `socket` cache.
    connecting = null;
  }
}

/** Release interest; disconnects the socket when no consumers remain. */
export function releaseSocket(): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Tear down the connection unconditionally. Call on logout so a stale token
 * can't linger on an open socket.
 */
export function resetSocket(): void {
  refCount = 0;
  connecting = null;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
