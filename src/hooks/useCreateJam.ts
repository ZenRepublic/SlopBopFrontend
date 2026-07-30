import { useState, useRef, useCallback } from 'react';
import { createJam, ApiError, type CreatedJam } from '../services/slopbop';
import { useAuth } from '../context/AuthContext';

/**
 * Start a jam for an artist the session owns. Command-shaped: one action, its
 * in-flight flag, and the last error.
 *
 * `creating` is for the button's spinner; the `inFlight` ref is the actual guard.
 * Creation renders a cover and uploads it to Arweave before it returns, so it
 * takes seconds and is not idempotent — two clicks would make two jams with two
 * uploads. A disabled attribute alone loses that race on a fast double-tap, so a
 * second call while one is running is dropped here rather than trusted to the UI.
 *
 * Resolves to the new jam (navigate to `/jams/${collection_id}`), or null on
 * failure with `error` set. A suppressed double-fire is also null — the first
 * call is still running and will deliver the jam.
 */
export function useCreateJam() {
  const { logout } = useAuth();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const create = useCallback(
    async (artistId: string, cta?: string): Promise<CreatedJam | null> => {
      if (inFlight.current) return null;
      inFlight.current = true;
      setCreating(true);
      setError(null);
      try {
        return await createJam(artistId, cta);
      } catch (err) {
        setError(messageFor(err, logout));
        return null;
      } finally {
        inFlight.current = false;
        setCreating(false);
      }
    },
    [logout],
  );

  return { create, creating, error };
}

function messageFor(err: unknown, logout: () => void): string {
  if (err instanceof ApiError) {
    // The week ran out mid-session. Nothing else notices a 401 outside the
    // mount-time /auth/me, so drop the session here — that puts the UI back in
    // its signed-out state, where the Account sheet asks for a signature again.
    if (err.status === 401) {
      logout();
      return 'Your session expired. Sign in again to start a jam.';
    }
    if (err.status === 403) return "This wallet doesn't manage that artist.";
  }
  return 'Could not start the jam. Try again.';
}
