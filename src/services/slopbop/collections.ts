import { apiFetch } from './client';
import { Song } from './songs';
import type { RequestClosedReason } from './requests';
import type { JamStatus } from './jams';

// How a collection resolves its songs and which extra fields it carries. All
// three resolve their songs by collection_id back-reference and carry the same
// shape; what separates them is how the songs get there:
//
//   album    authored by the artist alone. Not crowdsourced, but it fills the
//            same way: the owner posts tracks one at a time until it's full,
//            then releases it. So detail does return a `request_status` — it
//            just comes back with `submitters: 'owner'`, which is the whole of
//            how the submission path knows to treat it differently. Nothing
//            branches on the type for that. The permanent catalogue (see
//            Discography); `albums.ts` has the three writes only the owner can
//            make.
//   mixtape  crowdsourced against a submission window and released as a batch —
//            what a Mixtape Commission produces.
//   jam      crowdsourced, each song published as it's produced. A timed event
//            the label runs: a submission window (capped by capacity too), then
//            the most-bopped song is promoted to a single and the rest are
//            deleted. See `JamStatus` for the phases. The jam doc itself
//            survives its own resolution, since numbering the next one counts
//            the ones that came before.
//
// The union is also the seam for future kinds (e.g. a `playlist` that resolves
// an explicit song_id list instead).
export type CollectionType = 'album' | 'mixtape' | 'jam';

/**
 * Who a collection's submission door admits, declared by the server on
 * `RequestStatus.submitters`.
 *
 *   anyone  the crowdsourced types. Everyone may submit, so which of the two
 *           doors gets used is a question about the *session* alone.
 *   owner   the owning artist. Everyone else is refused with a 403, signed in
 *           or not, and the anonymous door refuses even them.
 *
 * It travels as data rather than being inferred from `type` on purpose: the rule
 * is the backend's, so a policy change — a restricted mixtape, say — arrives on
 * its own instead of needing a matching `if` here that nobody remembers to write.
 */
export type SubmissionAccess = 'anyone' | 'owner';

// The generic container for an artist's songs. `type` discriminates the kind.
export interface Collection {
  _id: string;
  artist_id: string;
  type: CollectionType;
  title?: string;
  song_count?: number;
  cover_url?: string;
  created_at?: string;
  // When this became public — the date to display, for every type. Only an album
  // actually stores one (it's stamped by the release write, and is null for as
  // long as the album is unfinished); a mixtape and a jam are public from the
  // moment they exist, so the server emits their `created_at` here. That makes
  // this the one date field a card or a page header should read: no fallback to
  // `created_at`, and a null is a real answer — an unreleased album has no date
  // to show yet.
  released_at?: string | null;
  // The artist's own pitch, in their voice — shown quoted on the profile's live
  // jam card. Jam-only, and optional: absent falls back to a default line, so an
  // artist who writes nothing still has a call to action.
  cta?: string;
  // Submission fields, returned by the list read. A mixtape and a jam both use
  // the full window (start → deadline) — a jam closes on whichever comes first,
  // filling up or running out of time, and can be scheduled to open later; an
  // album has neither clock, but does have a capacity. Prefer the evaluated
  // `RequestStatus` off collection detail where you have it — these are the raw
  // source, and the only thing available from a list.
  submission_start?: string;    // ISO or absent (always absent on an album)
  submission_deadline?: string; // ISO or absent (absent on an album, and on a pre-clock jam)
  // Tracks in so far, against the capacity. Set on all three types now — on an
  // album the pair is what says whether it can be released yet, which is the one
  // question a list read can answer about an album without a detail fetch:
  // `released_at === null && submission_count >= max_tracks`.
  submission_count?: number;
  max_tracks?: number;
  // The jam's winner, once it has one — the field whose presence *is* the
  // `resolved` phase. Jam-only, and the one piece of `JamStatus` the list read
  // carries, which is how a list can tell a running jam from a finished one
  // without a detail fetch per jam (see `useLiveJam`).
  selected_song_id?: string;
}

// Whether a collection is currently accepting song submissions, evaluated
// server-side on collection detail read. `open` gates the submission form; when
// closed, `reason` says why. The window runs from `submission_start` to
// `submission_deadline`, and both crowdsourced types now have both ends of it —
// a jam closes on capacity OR time, whichever comes first, and can sit before
// its start with `reason: 'not_started'`. An album has neither date and closes
// on capacity alone. `track_count` is the count of submissions received (the
// capacity gauge is track_count / max_tracks).
export interface RequestStatus {
  // Whether the collection would accept a submission right now — a fact about
  // the collection, not about who's looking. An album's closes on capacity
  // alone. Pair it with `submitters` to answer "may *this* viewer submit":
  //
  //   const canSubmit = status.open && (status.submitters === 'anyone' || isOwner);
  open: boolean;
  // Who the door admits: everyone, or the owning artist alone (an album). Read
  // from the same registry row the endpoint enforces against, so it can't drift
  // from what a submit would actually do — which is why the submit path picks
  // its door from this rather than re-deriving the rule from `type`.
  //
  // `owner` means *the artist who owns this collection*, not "anyone signed in":
  // a signed-in fan posting to an album is still a 403.
  submitters: SubmissionAccess;
  reason: RequestClosedReason | null;
  track_count: number;
  // Null when the collection was never given a capacity — the `not_configured`
  // case, where `open` is false and there is no gauge to render.
  max_tracks: number | null;
  submission_start: string | null;
  submission_deadline: string | null;
}

interface CollectionsResponse {
  success: boolean;
  collections: Collection[];
}

interface CollectionResponse {
  success: boolean;
  collection: Collection;
  // A resolved jam returns `[]`: the winner was lifted out of the collection and
  // the also-rans deleted, so there is nothing left to list. Fetch the winner by
  // `jam_status.selected_song_id`.
  songs: Song[];
  // Returned for all three types. An album's answers for its owner alone — see
  // the note on `CollectionType` — so it gates the owner's "add a track" control
  // rather than a public form.
  request_status?: RequestStatus;
  // Jam-only. Stacks on top of `request_status` rather than replacing it — the
  // two answer different questions, and only `request_status` gates the form.
  jam_status?: JamStatus;
}

// List an artist's collections, optionally filtered by kind (e.g. `'jam'`).
export const fetchCollections = (artistId: string, type?: CollectionType) => {
  const params = new URLSearchParams({ artist_id: artistId });
  if (type) params.set('type', type);
  return apiFetch<CollectionsResponse>(`/slopbop/collections?${params}`).then(r => r.collections);
};

export const fetchCollection = (id: string) =>
  apiFetch<CollectionResponse>(`/slopbop/collections/${id}`).then(r => ({
    collection: r.collection,
    songs: r.songs,
    requestStatus: r.request_status ?? null,
    jamStatus: r.jam_status ?? null,
  }));
