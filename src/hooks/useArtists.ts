import { useState, useEffect } from 'react';
import { fetchArtists, Artist } from '../services/api';
import { useToast } from '../context/ToastContext';

export function useArtists(limit?: number) {
  const { showToast } = useToast();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchArtists(limit)
      .then(map => setArtists(Object.values(map)))
      .catch(() => showToast('Failed to load artists'))
      .finally(() => setLoading(false));
  }, []);

  return { artists, loading };
}
