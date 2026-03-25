import { useState, useEffect, useRef } from 'react';
import { fetchCollection, Collection, Song } from '../services/api';
import { useToast } from '../context/ToastContext';

export function useCollection(id: string) {
  const { showToast } = useToast();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchKeyRef = useRef('');

  useEffect(() => {
    if (!id) return;

    const key = `collection-${id}`;
    fetchKeyRef.current = key;
    setLoading(true);

    fetchCollection(id)
      .then(data => {
        if (fetchKeyRef.current !== key) return;
        setCollection(data.collection);
        setSongs(data.songs);
      })
      .catch(() => showToast('Failed to load collection'))
      .finally(() => {
        if (fetchKeyRef.current === key) setLoading(false);
      });
  }, [id]);

  return { collection, songs, loading };
}