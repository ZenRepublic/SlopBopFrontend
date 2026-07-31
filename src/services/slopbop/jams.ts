import { apiFetch } from './client';

/**
 * The jam's own surface: the 7-day clock, and the two writes only the artist who
 * owns it can make. Reads stay generic — a jam is fetched with `fetchCollection`
 * like any other collection, which is why `JamStatus` is consumed from there.
 *
 * Both writes require a wallet session; `apiFetch` attaches the bearer token.
 */

// Where a jam is in its life, derived server-side from the clock and never
// stored. Orthogonal to `RequestStatus` — see `JamStatus` below.
export type JamPhase =
  // Before the submission deadline. Note this says nothing about whether a
  // submission would be accepted right now: a jam that hit capacity on day two
  // is closed to submissions and still `open`.
  | 'open'
  // Submissions shut; the artist's 24 hours to name the winner.
  | 'selecting'
  // Those 24 hours elapsed with no pick made. There is no auto-pick — the jam
  // simply sits here until someone decides what to do about it.
  | 'overdue'
  // A song was chosen. Terminal: a resolved jam stays resolved whatever the
  // clock says.
  | 'resolved';

/**
 * A jam's phase and the two moments it turns on. Returned as `jam_status` on the
 * collection detail read, jam-type only.
 *
 * **Not the same question as `request_status`**, and the two are deliberately not
 * merged: `request_status.open` is "can I submit right now" (capacity included)
 * and is the only thing that should gate the submit form; `phase` is "where is
 * this jam in its 7 days". A jam that filled early is closed to submissions while
 * still in its `open` phase, because the selection window opens at the 6-day mark
 * either way — every jam is exactly 7 days.
 */
export interface JamStatus {
  phase: JamPhase;
  /** When submissions shut. Null on jams created before jams had a clock. */
  submission_deadline: string | null;
  /** When the artist's pick is due — 24h after the submission deadline. */
  selection_deadline: string | null;
  /**
   * The winner, once there is one. The winning song has *left* the collection
   * (that's what promotion is), so a resolved jam's detail read returns
   * `songs: []` — fetch the winner by this id with `fetchSong`.
   */
  selected_song_id: string | null;
}

/**
 * What a 403 from either jam write means, in one wording. Both endpoints answer
 * an unowned artist and an unknown one identically — that's deliberate, so a
 * caller can't probe which artists exist — so there is exactly one thing to say.
 */
export const NOT_YOUR_ARTIST = "This wallet doesn't manage that artist.";

/** What the server derived for a jam it just created. */
export interface CreatedJam {
  collection_id: string;
  /** Display label — a count of jams, not an identifier. Don't key on it. */
  jam_number: number;
  title: string;
  cover_url: string;
  max_tracks: number;
}

/** What resolving a jam actually did. */
export interface JamSelectionResult {
  collection_id: string;
  selected_song_id: string;
  /** The jam's cover, which the winner inherited on its way out. */
  cover_url: string;
  /** How many also-rans were deleted. */
  deleted_songs: number;
}

interface CreateJamResponse extends CreatedJam {
  success: boolean;
}

interface SelectionResponse extends JamSelectionResult {
  success: boolean;
}

/**
 * Start a jam for an artist this wallet owns. `cta` is the artist's own pitch to
 * fans, quoted on the jam card; everything else — number, title, cover art,
 * capacity, deadline — is derived server-side, so there's nothing here a form
 * can get wrong.
 *
 * **Slow on purpose and not idempotent.** It renders the cover and uploads it to
 * Arweave before the insert, so expect several seconds — and two calls make two
 * jams with two uploads. Callers must not let it fire twice (`useCreateJam`
 * holds that guard).
 *
 * 403 = this wallet doesn't own that artist. Unknown artist answers identically,
 * so a caller can't probe which artists exist.
 */
export const createJam = (artistId: string, cta?: string) =>
  apiFetch<CreateJamResponse>('/slopbop/collections/jams', {
    method: 'POST',
    body: JSON.stringify({ artist_id: artistId, ...(cta ? { cta } : {}) }),
  }).then(r => ({
    collection_id: r.collection_id,
    jam_number: r.jam_number,
    title: r.title,
    cover_url: r.cover_url,
    max_tracks: r.max_tracks,
  }));

/**
 * Name the jam's winner. **Destructive and one-way**: the chosen song becomes a
 * standalone single carrying the jam's cover, and every other song in the jam is
 * deleted. Confirm before calling — there is no undo.
 *
 * The jam document itself survives, resolved rather than removed.
 *
 * Errors worth telling apart, by `ApiError.status`:
 *   403  this wallet doesn't own the artist
 *   404  that song isn't in this jam
 *   409  not in the selecting phase (still open, already resolved, or the
 *        window closed) — refetch the jam and re-render off the fresh phase
 *
 * Re-sending the *same* song against an already-resolved jam succeeds rather
 * than 409ing: resolving is three un-transacted writes, so a retry is how a
 * half-finished jam gets finished.
 */
export const selectJamWinner = (collectionId: string, songId: string) =>
  apiFetch<SelectionResponse>(`/slopbop/collections/jams/${collectionId}/selection`, {
    method: 'POST',
    body: JSON.stringify({ song_id: songId }),
  }).then(r => ({
    collection_id: r.collection_id,
    selected_song_id: r.selected_song_id,
    cover_url: r.cover_url,
    deleted_songs: r.deleted_songs,
  }));
