import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { acquireSocket, releaseSocket } from '../lib/socket';

export interface MaintenanceUpdateEvent {
  requestId: string;
  status: string;
  event: 'created' | 'status_changed' | 'assigned';
}

/**
 * Subscribe to realtime `maintenance:updated` events for this tenant. The tenant
 * room is joined on connect (see `lib/socket.ts`) and the server only pushes the
 * tenant's own request updates, so every event here is relevant.
 *
 * It is a *nudge*: the callback should refetch the request list (and any open
 * detail query) rather than trust the payload — the server stays the source of
 * truth for status/vendor/schedule.
 */
export function useMaintenanceSocket(
  onUpdate: (event: MaintenanceUpdateEvent) => void
): void {
  // Keep the latest callback without resubscribing on every render.
  const callbackRef = useRef(onUpdate);
  useEffect(() => {
    callbackRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    let active = true;
    let socket: Socket | null = null;

    const handler = (event: MaintenanceUpdateEvent) => {
      if (!active) return;
      callbackRef.current(event);
    };

    acquireSocket()
      .then((s) => {
        if (!active) {
          // Unmounted before the socket resolved — release the ref we took.
          releaseSocket();
          return;
        }
        socket = s;
        s.on('maintenance:updated', handler);
      })
      .catch(() => {
        // Connection failed; a focus refetch remains the fallback. acquireSocket()
        // always took a ref before rejecting, so always release it. `socket` stays
        // null here, so the cleanup below won't double-release.
        releaseSocket();
      });

    return () => {
      active = false;
      if (socket) {
        socket.off('maintenance:updated', handler);
        releaseSocket();
      }
    };
  }, []);
}
