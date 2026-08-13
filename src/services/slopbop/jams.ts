import { apiFetch } from './client';
import type { Collection, RequestStatus } from './collections';
import type { Song } from './songs';

/**
 * The jam's surface: the phases one moves through, and the one read that needs
 * no collection id.
 *
 * **There are no jam writes here.** Starting a jam and naming its winner both
 * moved behind the backend's curation key, so no wallet session can reach
 * either — a jam is something the label runs, not something an artist's owner
 * makes. The winner isn't picked at all any more: bops decide it.
 *
 * Reads stay generic — a jam is fetched with `fetchCollection` like any other
 * collection, which is why `JamStatus` is consumed from there.
 */

// Where a jam is in its life, derived server-side from the clock and never
// stored. Orthogonal to `RequestStatus` — see `JamStatus` below.
export type JamPhase =
  // It exists but hasn't opened. Count down to `submission_start`.
  | 'scheduled'
  // Inside the submission window. Note this says nothing about whether a
  // submission would be accepted right now: a jam that hit capacity on day two
  // is closed to submissions and still `open`.
  | 'open'
  // Submissions shut, winner being tallied. Nothing for anyone to do but wait —
  // the count decides it, so there's no one to chase.
  | 'awaiting_resolution'
  // A song won. Terminal: a resolved jam stays resolved whatever the clock says.
  | 'resolved'
  // It ran its window out with nobody entering, so there was nothing to resolve.
  // Rare, and terminal.
  | 'closed';

/**
 * A jam's phase and the moments it turns on. Returned as `jam_status` on the
 * collection detail read, jam-type only.
 *
 * **Not the same question as `request_status`**, and the two are deliberately not
 * merged: `request_status.open` is "can I submit right now" (capacity included)
 * and is the only thing that should gate the submit form; `phase` is where the
 * event itself has got to. A jam that filled early is closed to submissions
 * while still in its `open` phase, because the window runs on the clock either
 * way.
 */
export interface JamStatus {
  phase: JamPhase;
  /** When submissions open. Real now that a jam can be scheduled ahead. */
  submission_start: string | null;
  /** When submissions shut. */
  submission_deadline: string | null;
  /** When the winner was named. Null until `resolved`. */
  resolved_at: string | null;
  /**
   * The winner, once there is one. The winning song has *left* the collection
   * (that's what promotion is — its `collection_id` is cleared and the also-rans
   * are deleted), so a resolved jam's detail read returns `songs: []`. Fetch the
   * winner by this id with `fetchSong`; it carries the jam's `cover_url`, which
   * is what ties it back to the event.
   */
  selected_song_id: string | null;
}

interface CurrentJamResponse {
  success: boolean;
  collection: Collection | null;
  songs: Song[];
  request_status?: RequestStatus;
  jam_status?: JamStatus;
}

/**
 * The label's current jam, across the whole roster — the one jam read that takes
 * no collection id, and the reason a jam can headline the landing page instead
 * of hiding on whichever artist happens to be hosting.
 *
 * It answers in the exact shape of `fetchCollection`, so the same components
 * render it. Two things to hold onto:
 *
 *   - It returns the most recently *started* jam whatever its phase, so between
 *     events the last one keeps showing its winner rather than the page going
 *     blank.
 *   - Never having run one is a 200 with `collection: null`, not a 404. "There
 *     isn't one" is a fact about the label, not a missing resource — don't treat
 *     it as an error.
 */
export const fetchCurrentJam = () =>
  apiFetch<CurrentJamResponse>('/slopbop/collections/jams/current').then(r => ({
    collection: r.collection,
    songs: r.songs ?? [],
    requestStatus: r.request_status ?? null,
    jamStatus: r.jam_status ?? null,
  }));
