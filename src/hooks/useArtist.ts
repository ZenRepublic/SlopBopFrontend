import { useState, useEffect, useRef } from 'react';
import { fetchArtist, Artist } from '../services/api';
import { useToast } from '../context/ToastContext';

export function useArtist(id: string) {
  const { showToast } = useToast();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchKeyRef = useRef('');

  useEffect(() => {
    if (!id) return;

    const key = `artist-${id}`;
    fetchKeyRef.current = key;
    setLoading(true);

    fetchArtist(id)
      .then(data => {
        if (fetchKeyRef.current !== key) return;
        setArtist(data);
      })
      .catch(() => showToast('Failed to load artist'))
      .finally(() => {
        if (fetchKeyRef.current === key) setLoading(false);
      });
  }, [id]);

  return { artist, loading };
}
