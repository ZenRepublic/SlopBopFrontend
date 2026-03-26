import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollections } from '../../hooks/useCollections';
import { useSongs } from '../../hooks/useSongs';
import type { Collection, Song } from '../../services/api';
import CollectionCard from './CollectionCard';
import SingleCard from './SingleCard';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

interface Props {
  artistId: string;
}

export interface GroupedDiscography {
  collections: { collection: Collection; songs: Song[] }[];
  singles: Song[];
}

function useDiscography(artistId: string): { discography: GroupedDiscography; loading: boolean } {
  const { collections, loading: collectionsLoading } = useCollections(artistId);
  const { songs, loading: songsLoading } = useSongs(artistId);

  const discography = useMemo<GroupedDiscography>(() => {
    const songsByCollection = new Map<string, Song[]>();
    const singles: Song[] = [];

    for (const song of songs) {
      if (song.collectionId) {
        const list = songsByCollection.get(song.collectionId) ?? [];
        list.push(song);
        songsByCollection.set(song.collectionId, list);
      } else {
        singles.push(song);
      }
    }

    const grouped = collections.map(col => ({
      collection: col,
      songs: songsByCollection.get(col._id) ?? [],
    }));

    return { collections: grouped, singles };
  }, [collections, songs]);

  return { discography, loading: collectionsLoading || songsLoading };
}

export default function Discography({ artistId }: Props) {
  const { discography, loading } = useDiscography(artistId);
  const { play } = useMusicPlayer();
  const navigate = useNavigate();

  if (loading) return null;
  if (!discography.collections.length && !discography.singles.length) return null;

  return (
    <div className="flex flex-col gap-lg">
      {discography.collections.length > 0 && (
        <div className="flex flex-col gap-md">
          <h2 className="font-display text-lg">Albums</h2>
          <div className="grid grid-cols-2 gap-md">
            {discography.collections.map(({ collection }) => (
              <CollectionCard
                key={collection._id}
                coverUrl={collection.coverUrl}
                title={collection.title || 'Untitled'}
                onClick={() => navigate(`/collections/${collection._id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {discography.singles.length > 0 && (
        <div className="flex flex-col gap-md">
          <h2 className="font-display text-lg">Singles</h2>
          <div className="flex flex-col bg-[var(--bg-secondary)] rounded-lg p-sm">
            {discography.singles.map((song, i) => (
              <div key={song._id}>
                {i > 0 && <div className="border-t border-white/10 my-xs" />}
                <SingleCard
                  coverUrl={song.coverUrl}
                  title={song.title || 'Untitled'}
                  duration={song.duration}
                  onClick={() => play({
                    id: song._id,
                    title: song.title || 'Untitled',
                    coverUrl: song.coverUrl,
                    audioUrl: song.audioUrl || '',
                    duration: song.duration,
                    lyrics: song.lyrics,
                    stats: song.stats,
                  })}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}