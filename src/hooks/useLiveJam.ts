import { useCollections } from './useCollections';
import type { Collection } from '../services/slopbop';

// The artist's open mixtape, if they have one.
//
// A mixtape has no lifecycle flag — its *existence* is the live state. It's
// created when the session opens and deleted outright when the artist picks the
// winning song (which survives as a single; the rest are deleted with it). So
// "does this artist have a mixtape collection" is the whole question, and a
// filtered list read answers it.
//
// An artist can only have one open at a time, so this collapses to a single
// mixtape or null; if the data ever says otherwise we take the newest rather
// than guessing.
export function useLiveMixtape(artistId: string): {
  mixtape: Collection | null;
  loading: boolean;
} {
  const { collections, loading } = useCollections(artistId, 'mixtape');

  const mixtape =
    [...collections].sort((a, b) =>
      (b.created_at ?? '').localeCompare(a.created_at ?? ''),
    )[0] ?? null;

  return { mixtape, loading };
}

/** Submissions in vs. capacity. `submission_count` is the authored field; fall
 *  back to `song_count` so a partially-populated document still reads. */
export function mixtapeCapacity(mixtape: Collection): {
  count: number;
  max: number;
  full: boolean;
} {
  const count = mixtape.submission_count ?? mixtape.song_count ?? 0;
  const max = mixtape.max_tracks ?? 0;
  return { count, max, full: max > 0 && count >= max };
}
