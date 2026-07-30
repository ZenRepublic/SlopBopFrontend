export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

// ---------------------------------------------------------------------------
// Session token
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'slopbop.auth';

interface StoredSession {
  wallet: string;
  token: string;
  /** Epoch ms the JWT stops being accepted. Absent on sessions stored before
   *  expiry was tracked — those stay usable and end at their first 401. */
  expiresAt?: number;
}

// The JWT names the wallet it was issued to, so a token is only meaningful next
// to the address it belongs to: with a stale token from a previous wallet,
// /auth/me answers happily — for the wrong owner. Storing the address alongside
// lets the auth layer notice the mismatch and drop the session instead.
let session: StoredSession | null = readSession();

function readSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (!parsed.wallet || !parsed.token) return null;
    return { wallet: parsed.wallet, token: parsed.token, expiresAt: parsed.expiresAt };
  } catch {
    // Unparseable, or storage is blocked (Safari private mode). Either way: no session.
    return null;
  }
}

// The server is still the authority — this only saves a round trip we already
// know the answer to, and stops the app spending a week acting signed-in on a
// token that stopped working. A clock that's wrong the other way just means the
// 401 arrives as usual.
function expired(s: StoredSession): boolean {
  return s.expiresAt != null && Date.now() >= s.expiresAt;
}

/** The bearer token, or null when there's no live session. Drops a token whose
 *  week ran out rather than sending it. */
export function getToken(): string | null {
  if (session && expired(session)) clearToken();
  return session?.token ?? null;
}

/** The wallet the stored token was issued to, or null when signed out. */
export function getTokenWallet(): string | null {
  if (session && expired(session)) clearToken();
  return session?.wallet ?? null;
}

/** `expiresIn` is the `expires_in` from /auth/verify, in seconds. */
export function setToken(wallet: string, token: string, expiresIn?: number) {
  session = {
    wallet,
    token,
    expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : undefined,
  };
  try {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
  } catch {
    // Storage blocked — the session still works, it just won't survive a reload.
  }
}

export function clearToken() {
  session = null;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* nothing to clean up */
  }
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

/**
 * A non-2xx response. Carries `status` so callers can tell the cases apart —
 * 401 means the session is over (re-login), 404 means it isn't there, 500 means
 * the server is unhappy — and the server's own `{ error }` string as the message.
 */
export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

// `headers` is narrowed to a plain record so it can be merged rather than
// replaced. The whole-object spread that RequestInit invites would drop
// Content-Type and the bearer token the moment a caller passed a header.
type FetchOptions = Omit<RequestInit, 'headers'> & { headers?: Record<string, string> };

export async function apiFetch<T>(endpoint: string, options?: FetchOptions): Promise<T> {
  const { headers: extra, ...rest } = options ?? {};
  const token = getToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'GET',
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(`${endpoint}: ${body?.error ?? response.statusText}`, response.status);
  }

  return response.json();
}
