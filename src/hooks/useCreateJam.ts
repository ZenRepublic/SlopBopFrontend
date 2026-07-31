import { useState, useRef, useCallback } from 'react';
import { createJam, ApiError, NOT_YOUR_ARTIST, type CreatedJam } from '../services/slopbop';

/**
 * Start a jam for an artist the session controls. Command-shaped: one action,
 * its in-flight flag, and the last error.
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
 *
 * Note what is no longer here: any handling of an expired session. A 401 ends
 * the session inside `apiFetch`, which re-renders the app signed-out on its own,
 * so this only has to speak to what's specific to creating a jam.
 */
export function useCreateJam() {
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
        setError(messageFor(err));
        return null;
      } finally {
        inFlight.current = false;
        setCreating(false);
      }
    },
    [],
  );

  return { create, creating, error };
}

function messageFor(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return NOT_YOUR_ARTIST;
    // The session is already gone by now — this only names what was lost.
    if (err.status === 401) return 'Your session expired. Sign in again to start a jam.';
  }
  return 'Could not start the jam. Try again.';
}
