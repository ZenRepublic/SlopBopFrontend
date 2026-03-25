import { useState, useEffect, useRef } from 'react';
import { fetchCollections, Collection, CollectionType } from '../services/api';

export function useCollections(artistId: string, type?: CollectionType) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchKeyRef = useRef('');

  useEffect(() => {
    if (!artistId) return;

    const key = `collections-${artistId}-${type ?? 'all'}`;
    fetchKeyRef.current = key;
    setLoading(true);

    fetchCollections(artistId, type)
      .then(data => {
        if (fetchKeyRef.current !== key) return;
        setCollections(data);
      })
      .catch(() => { /* artist may only have singles */ })
      .finally(() => {
        if (fetchKeyRef.current === key) setLoading(false);
      });
  }, [artistId, type]);

  return { collections, loading };
}