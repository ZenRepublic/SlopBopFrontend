import { useResource } from './useResource';
import { fetchCollection, Song } from '../services/slopbop';
import { useToast } from '../context/ToastContext';

// Loads a single jam — a jam-type collection — for the jam page.
// Same generic detail read as a mixtape (`fetchCollection`); a jam shares the
// collection shape and, once the backend enriches it, the same `requestStatus`
// (open until capacity, no start/deadline window).
export function useJam(id: string) {
  const { showToast } = useToast();
  const { data, loading, refetch } = useResource(
    () => fetchCollection(id),
    id ? `collection-${id}` : '',
    { onError: () => showToast('Failed to load jam') },
  );
  return {
    jam: data?.collection ?? null,
    songs: (data?.songs ?? []) as Song[],
    requestStatus: data?.requestStatus ?? null,
    loading,
    refetch,
  };
}
