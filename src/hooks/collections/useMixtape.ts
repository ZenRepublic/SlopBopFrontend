import { useResource } from '../useResource';
import { fetchCollection, Song } from '../../services/slopbop';
import { useToast } from '../../context/ToastContext';

// Loads a single mixtape — a mixtape-type collection — for the mixtape page. The
// detail read is generic (`fetchCollection`); this maps it onto the mixtape shape
// the page renders, including the mixtape-only `requestStatus`.
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
