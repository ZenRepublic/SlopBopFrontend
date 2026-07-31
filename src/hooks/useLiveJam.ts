import { useCollections } from './useCollections';
import type { Collection } from '../services/slopbop';

// The artist's jam that hasn't finished yet, if they have one.
//
// A jam has no lifecycle flag — but it does have an outcome. Resolving one no
// longer deletes it: the doc stays as an archive, because the next jam's number
// is a count of the ones before it, and numbering would repeat if they vanished.
// So "live" is the absence of a winner, and the list read carries
// `selected_song_id` precisely so this question is answerable without a detail
// fetch per jam.
//
// Unresolved covers three of the four phases — open, selecting and overdue — and
// all three belong on the profile: the first asks for submissions, the other two
// are the artist owing everyone a decision. Which of them it is comes from
// `jam_status` on the jam's own detail read, not from here.
//
// An artist should only have one unfinished jam at a time, so this collapses to
// a single jam or null; if the data ever says otherwise we take the newest
// rather than guessing.
export function useLiveJam(artistId: string): {
  jam: Collection | null;
  loading: boolean;
  refetch: () => void;
} {
  const { collections, loading, refetch } = useCollections(artistId, 'jam');

  const jam =
    collections
      .filter(c => !c.selected_song_id)
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))[0] ?? null;

  return { jam, loading, refetch };
}

/** Submissions in vs. capacity. `submission_count` is the authored field; fall
 *  back to `song_count` so a partially-populated document still reads. */
export function jamCapacity(jam: Collection): {
  count: number;
  max: number;
  full: boolean;
} {
  const count = jam.submission_count ?? jam.song_count ?? 0;
  const max = jam.max_tracks ?? 0;
  return { count, max, full: max > 0 && count >= max };
}
