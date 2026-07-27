import { useResource } from './useResource';
import { fetchCollection, Song } from '../services/slopbop';
import { useToast } from '../context/ToastContext';

// Loads a single album — an album-type collection — for the album page. The
// detail read is generic (`fetchCollection`); this maps it onto the album shape
// the page renders, including the album-only `requestStatus`.
export function useAlbum(id: string) {
  const { showToast } = useToast();
  const { data, loading, refetch } = useResource(
    () => fetchCollection(id),
    id ? `collection-${id}` : '',
    { onError: () => showToast('Failed to load album') },
  );
  return {
    album: data?.collection ?? null,
    songs: (data?.songs ?? []) as Song[],
    requestStatus: data?.requestStatus ?? null,
    loading,
    refetch,
  };
}
