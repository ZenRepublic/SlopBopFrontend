import { useResource } from './useResource';
import { fetchCollection, Song } from '../services/slopbop';
import { useToast } from '../context/ToastContext';

// Loads a single mixtape — a mixtape-type collection — for the mixtape page.
// Same generic detail read as an album (`fetchCollection`); a mixtape shares the
// collection shape and, once the backend enriches it, the same `requestStatus`
// (open until capacity, no start/deadline window).
export function useMixtape(id: string) {
  const { showToast } = useToast();
  const { data, loading, refetch } = useResource(
    () => fetchCollection(id),
    id ? `collection-${id}` : '',
    { onError: () => showToast('Failed to load mixtape') },
  );
  return {
    mixtape: data?.collection ?? null,
    songs: (data?.songs ?? []) as Song[],
    requestStatus: data?.requestStatus ?? null,
    loading,
    refetch,
  };
}
