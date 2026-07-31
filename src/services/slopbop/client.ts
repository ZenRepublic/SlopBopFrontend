import { getToken, signOut } from './session';

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

/**
 * The parsed JSON of a non-2xx response, or null when there wasn't any. `error`
 * is the one field the whole API agrees on; anything past it is endpoint-specific
 * (a field-error map, a `reason` code) and needs a cast at the point of use —
 * which is where the caller knows what it asked for.
 */
export type ApiErrorBody = { error?: string; [key: string]: unknown } | null;

/**
 * A non-2xx response.
 *
 * `status` lets callers tell the cases apart — 403 means it isn't yours, 404
 * means it isn't there, 409 means the state moved under you. `body` is the
 * server's parsed JSON, so an endpoint answering with something richer than
 * `{ error }` (field-error maps, a `reason` code) can be read without dropping
 * out of `apiFetch` to hand-roll a fetch — which is how a caller used to lose
 * the Authorization header by accident.
 *
 * 401 is deliberately absent from that list: by the time this is thrown the
 * session has already been ended for you. See below.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: ApiErrorBody = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// `headers` is narrowed to a plain record so it can be merged rather than
// replaced. The whole-object spread that RequestInit invites would drop
// Content-Type and the bearer token the moment a caller passed a header.
type FetchOptions = Omit<RequestInit, 'headers'> & { headers?: Record<string, string> };

/**
 * Every call to the Slop Bop API goes through here, authenticated or not — the
 * bearer token is attached whenever there's a session, so no endpoint needs to
 * opt in and none can forget.
 *
 * **Session expiry is handled here, once.** A 401 on a request that carried a
 * token means the session is over, so it's ended centrally and the whole app
 * re-renders signed-out. Feature code is then free to handle only what's
 * specific to it — 403, 404, 409 — instead of each hook re-implementing the
 * same "log out and apologise" branch and the next one forgetting to.
 */
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

    // Only when we actually sent a token. A 401 from /auth/verify means the
    // signature didn't check out — there is no session to end, and treating it
    // as an expiry would wipe the error the sign-in flow is about to report.
    if (response.status === 401 && token) {
      signOut('Your session expired. Sign in again to continue.');
    }

    throw new ApiError(
      `${endpoint}: ${body?.error ?? response.statusText}`,
      response.status,
      body,
    );
  }

  return response.json();
}
