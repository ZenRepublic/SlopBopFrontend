import { useResource } from './useResource';
import { fetchArtist } from '../services/slopbop';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export function useArtist(id: string) {
  const { showToast } = useToast();
  const { wallet } = useAuth();

  // The session is part of the key, not just of the request: the same URL
  // answers differently signed in (`is_owner`), which is why the route sends
  // `Vary: Authorization`. Keying on the wallet makes logging in or out refetch
  // instead of leaving a page that still thinks you're a stranger.
  const { data, loading } = useResource(
    () => fetchArtist(id),
    id ? `artist-${id}-${wallet ?? 'anon'}` : '',
    { onError: () => showToast('Failed to load artist') },
  );

  return { artist: data?.artist ?? null, isOwner: data?.isOwner ?? false, loading };
}
