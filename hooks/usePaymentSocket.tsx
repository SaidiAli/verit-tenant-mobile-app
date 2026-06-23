import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { acquireSocket, releaseSocket } from '../lib/socket';

export interface PaymentUpdateEvent {
  paymentId: string;
  leaseId: string;
  transactionId: string | null;
  status: 'completed' | 'failed' | 'pending';
}

/**
 * Subscribe to realtime `payment:updated` events for a single in-flight
 * transaction. The callback fires whenever the backend pushes a status change
 * for this transaction (or a payload with no transactionId, which we can't rule
 * out). It is a *nudge*: the consumer should re-check the authoritative
 * `/payments/status` endpoint rather than trust the event payload directly.
 */
export function usePaymentSocket(
  transactionId: string | undefined,
  onUpdate: (event: PaymentUpdateEvent) => void
): void {
  // Keep the latest callback without resubscribing on every render.
  const callbackRef = useRef(onUpdate);
  useEffect(() => {
    callbackRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!transactionId) return;

    let active = true;
    let socket: Socket | null = null;

    const handler = (event: PaymentUpdateEvent) => {
      if (!active) return;
      // Only react to events for this exact transaction. The backend may emit
      // payloads with a null transactionId (it's `string | null`); those tell us
      // nothing about which payment changed, so ignore them rather than refetch.
      if (event.transactionId !== transactionId) return;
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
        s.on('payment:updated', handler);
      })
      .catch(() => {
        // Connection failed; polling remains the fallback. acquireSocket()
        // always took a ref before rejecting, so always release it. `socket`
        // stays null here, so the cleanup below won't double-release.
        releaseSocket();
      });

    return () => {
      active = false;
      if (socket) {
        socket.off('payment:updated', handler);
        releaseSocket();
      }
    };
  }, [transactionId]);
}
