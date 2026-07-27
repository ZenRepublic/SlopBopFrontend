import { useResource } from './useResource';
import { fetchCollection, Song } from '../services/slopbop';
import { useToast } from '../context/ToastContext';

// Loads a single album — an album-type collection — for the album page. The same
// generic detail read as a mixtape or jam (`fetchCollection`), minus the
// submission half: an album is authored by the artist rather than crowdsourced,
// so the backend returns no `request_status` and there is nothing here to gate a
// form on. It's a title, a cover, and its songs.
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
    loading,
    refetch,
  };
}
