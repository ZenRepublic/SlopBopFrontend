import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollections } from '../../hooks/useCollections';
import { useSongs } from '../../hooks/useSongs';
import type { Collection, Song } from '../../services/slopbop';
import AlbumCard from './AlbumCard';
import SongList from '../../components/songlist/SongList';

interface Props {
  artistId: string;
  artistName?: string;
}

// The artist's permanent catalogue — authored albums, plus the singles that never
// landed on one. Only type `album` is read here, which is what keeps the other
// two kinds out, each for its own reason:
//
//   jam      a live session, not a release — it surfaces as the LIVE card at the
//            top of the profile and is gone once it resolves.
//   mixtape  a commissioned group's artifact from their own day. Listing it would
//            file someone's birthday party under the label's discography. It
//            stays reachable by its own link; it just isn't the artist's work.
//
// Songs from either are excluded for free — they carry a `collection_id`, so they
// never fall through to singles.
export interface GroupedDiscography {
  albums: { album: Collection; songs: Song[] }[];
  singles: Song[];
}

function useDiscography(artistId: string): {
  discography: GroupedDiscography;
  loading: boolean;
  refetch: () => void;
} {
  const { collections: albums, loading: albumsLoading } = useCollections(artistId, 'album');
  const { songs, loading: songsLoading, refetch } = useSongs(artistId);

  const discography = useMemo<GroupedDiscography>(() => {
    const songsByCollection = new Map<string, Song[]>();
    const singles: Song[] = [];

    for (const song of songs) {
      if (song.collection_id) {
        const list = songsByCollection.get(song.collection_id) ?? [];
        list.push(song);
        songsByCollection.set(song.collection_id, list);
      } else {
        singles.push(song);
      }
    }

    const group = (collections: Collection[]) =>
      collections.map(album => ({
        album,
        songs: songsByCollection.get(album._id) ?? [],
      }));

    return { albums: group(albums), singles };
  }, [albums, songs]);

  return {
    discography,
    loading: albumsLoading || songsLoading,
    refetch,
  };
}

export default function Discography({ artistId, artistName }: Props) {
  const { discography, loading, refetch } = useDiscography(artistId);
  const navigate = useNavigate();

  if (loading) return null;
  if (!discography.albums.length && !discography.singles.length) return null;

  return (
    <div className="flex flex-col gap-lg">
      {discography.albums.length > 0 && (
        <div className="flex flex-col gap-md">
          <h2 className="font-display text-lg">Albums</h2>
          <div className="grid grid-cols-2 gap-md">
            {discography.albums.map(({ album }) => (
              <AlbumCard
                key={album._id}
                coverUrl={album.cover_url}
                title={album.title || 'Untitled'}
                onClick={() => navigate(`/albums/${album._id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {discography.singles.length > 0 && (
        <SongList
          songs={discography.singles}
          header={<h2 className="font-display text-lg">Singles</h2>}
          onRefetch={refetch}
          toTrack={song => ({
            id: song._id,
            title: song.title || 'Untitled',
            coverUrl: song.cover_url,
            audioUrl: song.audio_url || '',
            duration: song.duration,
            lyrics: song.lyrics,
            author: song.author,
            stats: song.stats,
            artistId: song.artist_id,
            artistName,
          })}
        />
      )}
    </div>
  );
}
