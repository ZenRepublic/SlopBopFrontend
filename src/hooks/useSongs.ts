import { useState, useEffect, useRef } from 'react';
import { fetchSongs, Song } from '../services/api';
import { useToast } from '../context/ToastContext';

export function useSongs(artistId: string) {
  const { showToast } = useToast();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchKeyRef = useRef('');

  useEffect(() => {
    if (!artistId) return;

    const key = `songs-${artistId}`;
    fetchKeyRef.current = key;
    setLoading(true);

    fetchSongs(artistId)
      .then(data => {
        if (fetchKeyRef.current !== key) return;
        setSongs(data);
      })
      .catch(() => showToast('Failed to load songs'))
      .finally(() => {
        if (fetchKeyRef.current === key) setLoading(false);
      });
  }, [artistId]);

  return { songs, loading };
}