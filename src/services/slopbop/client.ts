export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

// ---------------------------------------------------------------------------
// Session token
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'slopbop.auth';

interface StoredSession {
  wallet: string;
  token: string;
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
    return parsed.wallet && parsed.token ? { wallet: parsed.wallet, token: parsed.token } : null;
  } catch {
    // Unparseable, or storage is blocked (Safari private mode). Either way: no session.
    return null;
  }
}

export const getToken = () => session?.token ?? null;

/** The wallet the stored token was issued to, or null when signed out. */
export const getTokenWallet = () => session?.wallet ?? null;

export function setToken(wallet: string, token: string) {
  session = { wallet, token };
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
