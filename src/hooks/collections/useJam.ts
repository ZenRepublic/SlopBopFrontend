import { useResource } from '../useResource';
import { fetchCollection, Song } from '../../services/slopbop';
import { useToast } from '../../context/ToastContext';

// Loads a single jam — a jam-type collection — for the jam page. The same
// generic detail read as a mixtape (`fetchCollection`); what a jam adds is
// `jamStatus`.
//
// The two statuses are both returned because they answer different questions and
// the page needs both:
//
//   requestStatus  can someone submit right now (capacity included) — the ONLY
//                  thing that should gate the submit form. A jam that filled on
//                  day two is closed while its phase is still `open`.
//   jamStatus      where the event has got to — which act of the page to render
//                  (scheduled / submitting / tallying / won / dead).
//
// A resolved jam comes back with `songs: []`: the winner was lifted out of the
// collection and the rest deleted. Fetch it with `useSong(jamStatus.selected_song_id)`.
export function useJam(id: string) {
  const { showToast } = useToast();
  const { data, loading, refetch } = useResource(
    () => fetchCollection(id),
    id ? `collection-${id}` : '',
    {
      onError: () => showToast('Failed to load jam'),
      // Bops decide the winner, so an open jam's ranking is a live race — poll it
      // so the order moves on its own while the room is watching. Every other
      // phase is static until a countdown elapses, and refetches on that.
      pollMs: d => (d?.jamStatus?.phase === 'open' ? 30_000 : undefined),
    },
  );
  return {
    jam: data?.collection ?? null,
    songs: (data?.songs ?? []) as Song[],
    requestStatus: data?.requestStatus ?? null,
    jamStatus: data?.jamStatus ?? null,
    loading,
    // Phases turn on wall-clock deadlines the server evaluates, so the way a page
    // advances is to refetch when a countdown elapses — same as the mixtape's
    // window.
    refetch,
  };
}
