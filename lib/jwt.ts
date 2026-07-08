// Minimal client-side JWT inspection. We do NOT verify the signature — the
// server is the only authority on token validity. This is purely a proactive
// UX guard: skip optimistically restoring a session whose `exp` has already
// passed, instead of flashing the authenticated shell and waiting for the
// first request to 401. Any decode failure is treated as "unknown, not
// expired" so we never block a login on a parsing quirk — the reactive 401
// path in lib/api.ts remains the real backstop.

function base64UrlDecode(segment: string): string | null {
  try {
    let base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) base64 += '='.repeat(4 - pad);

    // Hermes (RN 0.74+) exposes a global atob; guard in case it is absent.
    if (typeof atob !== 'function') return null;
    const binary = atob(base64);

    // atob yields a binary (Latin-1) string; re-decode as UTF-8 so multi-byte
    // claim values (e.g. names) survive.
    const utf8 = decodeURIComponent(
      Array.prototype.map
        .call(binary, (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return utf8;
  } catch {
    return null;
  }
}

/**
 * Extract the `exp` claim (seconds since epoch) from a JWT, or null if the
 * token is malformed / has no numeric `exp`.
 */
export function getTokenExp(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const payloadJson = base64UrlDecode(parts[1]);
  if (!payloadJson) return null;

  try {
    const payload = JSON.parse(payloadJson);
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

/**
 * True only when we can positively prove the token is past its `exp`. A token
 * we can't parse (or one lacking `exp`) returns false — we defer to the server.
 * `skewSeconds` treats tokens expiring within the window as already expired to
 * avoid firing a request that is certain to 401.
 */
export function isTokenExpired(token: string, skewSeconds = 30): boolean {
  const exp = getTokenExp(token);
  if (exp === null) return false;
  const nowSeconds = Date.now() / 1000;
  return nowSeconds >= exp - skewSeconds;
}
