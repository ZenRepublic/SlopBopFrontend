import { apiFetch } from './client';
import { Song } from './songs';
import type { RequestClosedReason } from './requests';

// How a collection resolves its songs and which extra fields it carries. All
// three resolve their songs by collection_id back-reference and carry the same
// shape; what separates them is how the songs get there:
//
//   album    authored by the artist — not crowdsourced at all, so detail returns
//            no `request_status`. The permanent catalogue (see Discography).
//   mixtape  crowdsourced against a submission window and released as a batch —
//            what a Mixtape Commission produces.
//   jam      crowdsourced with no window, open until capacity, each song
//            published as it's produced. A live session: it exists only while
//            it's running and is deleted when the artist picks the winner.
//
// The union is also the seam for future kinds (e.g. a `playlist` that resolves
// an explicit song_id list instead).
export type CollectionType = 'album' | 'mixtape' | 'jam';

// The generic container for an artist's songs. `type` discriminates the kind.
export interface Collection {
  _id: string;
  artist_id: string;
  type: CollectionType;
  title?: string;
  song_count?: number;
  cover_url?: string;
  created_at?: string;
  // The artist's own pitch, in their voice — shown quoted on the profile's live
  // jam card. Jam-only, and optional: absent falls back to a default line, so an
  // artist who writes nothing still has a call to action.
  cta?: string;
  // Submission fields, authored on the crowdsourced kinds and returned by the
  // list read. A mixtape uses the full window (start → deadline); a jam has no
  // window, only capacity, so it carries just the count and max; an album has
  // neither. Prefer the evaluated `RequestStatus` off collection detail where you
  // have it — these are the raw source, and the only thing available from a list.
  submission_start?: string;    // ISO or absent
  submission_deadline?: string; // ISO or absent
  submission_count?: number;    // seeds submitted so far
  max_tracks?: number;
}

// Whether a crowdsourced collection (mixtape or jam) is currently accepting song
// submissions, evaluated server-side on collection detail read. `open` gates the
// submission form; when closed, `reason` says why. The window runs from
// `submission_start` to `submission_deadline` (both null on a jam, which is
// capacity-bound only). `track_count` is the count of submissions received (the
// capacity gauge is track_count / max_tracks).
export interface RequestStatus {
  open: boolean;
  reason: RequestClosedReason | null;
  track_count: number;
  max_tracks: number;
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
  songs: Song[];
  // Present only on the crowdsourced types (mixtape, jam); an album omits it.
  request_status?: RequestStatus;
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
  }));
