import { useState, useRef, useCallback } from 'react';
import {
  selectJamWinner,
  ApiError,
  NOT_YOUR_ARTIST,
  type JamSelectionResult,
} from '../../services/slopbop';

/**
 * Discriminated because the caller has to *do* different things, not just say
 * different things:
 *
 *   conflict (409)  the phase moved under us — the jam is still open, already
 *                   resolved, or the window closed. Refetch and re-render off
 *                   the fresh phase; the message alone would be a lie the moment
 *                   it's shown.
 *   forbidden (403) this wallet doesn't control the artist. `is_owner` is a
 *                   hint, so this is the real answer arriving late.
 *   expired (401)   the session ran out. `apiFetch` has already ended it and the
 *                   app is re-rendering signed-out; this only names what happened.
 *   error           anything else, including the song not being in the jam.
 */
export type JamSelectionOutcome =
  | { ok: true; result: JamSelectionResult }
  | { ok: false; kind: 'conflict' | 'forbidden' | 'expired' | 'error'; message: string };

/**
 * The artist names their jam's winner.
 *
 * **Irreversible**: the pick becomes a standalone single carrying the jam's
 * cover, and every other song in the jam is deleted. Confirm before calling —
 * this hook does not, and there is no undo. The jam document itself survives,
 * resolved rather than deleted.
 *
 * Guarded against a double-fire like `useCreateJam`, for a different reason: the
 * write is atomic and a repeat of the *same* song is deliberately tolerated
 * server-side, so a second click can't destroy anything extra — it would just
 * race two requests to the same answer and show whichever lost as a conflict.
 */
export function useSelectJamWinner() {
  const [selecting, setSelecting] = useState(false);
  const inFlight = useRef(false);

  const select = useCallback(
    async (collectionId: string, songId: string): Promise<JamSelectionOutcome> => {
      if (inFlight.current) {
        return { ok: false, kind: 'error', message: 'Already picking a winner.' };
      }
      inFlight.current = true;
      setSelecting(true);
      try {
        return { ok: true, result: await selectJamWinner(collectionId, songId) };
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 409) {
            return {
              ok: false,
              kind: 'conflict',
              message: err.message,
            };
          }
          if (err.status === 403) {
            return { ok: false, kind: 'forbidden', message: NOT_YOUR_ARTIST };
          }
          if (err.status === 401) {
            return {
              ok: false,
              kind: 'expired',
              message: 'Your session expired. Sign in again to pick the winner.',
            };
          }
          if (err.status === 404) {
            return {
              ok: false,
              kind: 'error',
              message: 'That song is no longer in this jam.',
            };
          }
        }
        return { ok: false, kind: 'error', message: 'Could not pick the winner. Try again.' };
      } finally {
        inFlight.current = false;
        setSelecting(false);
      }
    },
    [],
  );

  return { select, selecting };
}
