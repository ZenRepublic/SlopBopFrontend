import { useState, useRef, useCallback, useEffect } from 'react';
import { useResource } from './useResource';
import {
  createVisual,
  fetchDrafts,
  fetchImages,
  saveDraft,
  deleteImage,
  ApiError,
  NOT_YOUR_ARTIST,
} from '../services/slopbop';

/**
 * The image creator tab for one artist: the drafts, the saved images, and the
 * three things an owner does with them.
 *
 * One hook rather than a lists hook plus a mutations hook, because both writes
 * change what the lists contain — a render adds a draft, a save moves one from
 * drafts to images — and splitting them would leave the component wiring that
 * handoff by hand.
 */

/** How often to check whether the render landed. */
const POLL_MS = 4000;

/**
 * When to stop checking. A failed render is filed nowhere, so nothing will ever
 * arrive to end the wait — without this the tab spins forever on a fault. Long
 * enough to sit behind a song or a video the studio is already working on.
 */
const GIVE_UP_MS = 5 * 60 * 1000;

const TIMED_OUT = "That render hasn't come back. It may still be queued behind other work — try again.";

export function useImageStudio(artistId: string) {
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The guard for one-at-a-time. A ref, not `generating`: two clicks in the same
  // tick both read the same stale state, and the server enforces nothing.
  const busy = useRef(false);
  // The newest draft at the moment we ordered. A different one on top means ours.
  const baseline = useRef<string | null>(null);
  const deadline = useRef(0);

  const draftsResource = useResource(
    () => fetchDrafts(artistId),
    artistId ? `drafts-${artistId}` : '',
    {
      // Only while something is outstanding — an idle tab makes no requests.
      pollMs: () => (generating ? POLL_MS : undefined),
      onError: () => setError('Could not load your drafts.'),
    },
  );

  const imagesResource = useResource(
    () => fetchImages(artistId),
    artistId ? `images-${artistId}` : '',
    { onError: () => setError('Could not load your saved images.') },
  );

  const drafts = draftsResource.data ?? [];
  const images = imagesResource.data ?? [];
  // Pulled out because the resource objects are new every render; these aren't.
  const { refetch: refetchDrafts } = draftsResource;
  const { refetch: refetchImages } = imagesResource;

  const stopWaiting = useCallback((message?: string) => {
    busy.current = false;
    setGenerating(false);
    if (message) setError(message);
  }, []);

  // Arrival, or giving up. Runs on every poll result, which is also what paces
  // the timeout check — there's no separate timer to clean up.
  useEffect(() => {
    if (!generating) return;
    const newest = draftsResource.data?.[0]?.image_id ?? null;
    if (newest && newest !== baseline.current) {
      stopWaiting();
    } else if (Date.now() > deadline.current) {
      stopWaiting(TIMED_OUT);
    }
  }, [draftsResource.data, generating, stopWaiting]);

  /**
   * Order a render. Resolves as soon as the order is accepted — `generating`
   * stays true until the draft shows up (or the wait times out), which is the
   * flag the UI should disable the form on.
   *
   * A reroll is this with `replaces` set: `create(draft.prompt, draft.image_id)`
   * drops that attempt as part of ordering its successor. The tab therefore has
   * no draft to show while it runs — the old one goes when the order is placed,
   * not when the new one arrives.
   *
   * Returns false if it was refused, or dropped because one is already running.
   */
  const create = useCallback(
    async (prompt: string, replaces?: string): Promise<boolean> => {
      if (busy.current || !artistId) return false;
      busy.current = true;
      setError(null);
      baseline.current = draftsResource.data?.[0]?.image_id ?? null;
      deadline.current = Date.now() + GIVE_UP_MS;
      setGenerating(true);
      try {
        await createVisual(artistId, prompt, replaces);
        // The replaced draft is already gone server-side; show that now rather
        // than leaving a dead card up for a poll cycle.
        if (replaces) refetchDrafts();
        return true;
      } catch (err) {
        stopWaiting(messageFor(err, 'Could not start that render.'));
        return false;
      }
    },
    [artistId, draftsResource.data, refetchDrafts, stopWaiting],
  );

  /**
   * Keep a draft. Several seconds of Arweave upload — cover it with `saving`.
   * On success the draft leaves the drafts list and joins the images list, so
   * both are refetched here.
   */
  const save = useCallback(
    async (imageId: string): Promise<string | null> => {
      if (saving) return null;
      setSaving(true);
      setError(null);
      try {
        const url = await saveDraft(imageId);
        await Promise.all([refetchDrafts(), refetchImages()]);
        return url;
      } catch (err) {
        setError(messageFor(err, 'Could not save that image.'));
        return null;
      } finally {
        setSaving(false);
      }
    },
    [saving, refetchDrafts, refetchImages],
  );

  /**
   * Throw one away without ordering anything. Works on a saved image too, but
   * that only removes it from the list — Arweave keeps the copy forever.
   */
  const discard = useCallback(
    async (imageId: string): Promise<boolean> => {
      setError(null);
      try {
        await deleteImage(imageId);
        await Promise.all([refetchDrafts(), refetchImages()]);
        return true;
      } catch (err) {
        setError(messageFor(err, 'Could not delete that image.'));
        return false;
      }
    },
    [refetchDrafts, refetchImages],
  );

  const refetch = useCallback(() => {
    refetchDrafts();
    refetchImages();
  }, [refetchDrafts, refetchImages]);

  return {
    drafts,
    images,
    loading: draftsResource.loading || imagesResource.loading,
    /** True from ordering until the draft lands. Disable the form on it. */
    generating,
    saving,
    error,
    create,
    save,
    discard,
    refetch,
  };
}

function messageFor(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return NOT_YOUR_ARTIST;
    // The session is already gone by now — this only names what was lost.
    if (err.status === 401) return 'Your session expired. Sign in again to keep going.';
    // 400 is the prompt: empty, or past the cap. The server's wording is specific.
    if (err.status === 400 && err.body?.error) return String(err.body.error);
  }
  return fallback;
}
