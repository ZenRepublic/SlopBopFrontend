import { useMemo, useState } from 'react';
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

// The artist's catalogue, split across two tabs (see the `view` toggle below).
//
//   Original   the permanent catalogue — authored albums, plus the singles that
//              never landed on one. This is the default view and the artist's
//              own work.
//   Community  mixtapes: a commissioned group's artifact from their own day.
//              Filing someone's birthday party under the label's discography
//              would misread it, so it lives behind its own tab — a holding
//              place while we work out how to make mixtapes truly ephemeral.
//
// Jams are absent from both: a live session is not a release. One surfaces as
// the LIVE card at the top of the profile and is gone once it resolves.
//
// Singles are derived, not fetched: any song without a `collection_id`. Songs
// that belong to an album, mixtape, or jam all carry one, so they never fall
// through to singles.
export interface GroupedDiscography {
  albums: { album: Collection; songs: Song[] }[];
  singles: Song[];
  mixtapes: Collection[];
}

function useDiscography(artistId: string): {
  discography: GroupedDiscography;
  loading: boolean;
  refetch: () => void;
} {
  const { collections: albums, loading: albumsLoading } = useCollections(artistId, 'album');
  const { collections: mixtapes, loading: mixtapesLoading } = useCollections(artistId, 'mixtape');
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

    return { albums: group(albums), singles, mixtapes };
  }, [albums, songs, mixtapes]);

  return {
    discography,
    loading: albumsLoading || mixtapesLoading || songsLoading,
    refetch,
  };
}

type View = 'original' | 'community';

export default function Discography({ artistId, artistName }: Props) {
  const { discography, loading, refetch } = useDiscography(artistId);
  const navigate = useNavigate();
  const [view, setView] = useState<View>('original');

  if (loading) return null;

  const hasOriginal = discography.albums.length > 0 || discography.singles.length > 0;
  const hasCommunity = discography.mixtapes.length > 0;
  if (!hasOriginal && !hasCommunity) return null;

  // The toggle only earns its place once there's community work to switch to;
  // most artists have none, and a permanently half-empty control is just noise.
  // Without it the page reads exactly as it did before mixtapes existed.
  const showToggle = hasOriginal && hasCommunity;
  // Guard against a stale selection: if the artist has only mixtapes, the
  // default 'original' would render an empty tab with no way back.
  const activeView: View = showToggle ? view : hasCommunity ? 'community' : 'original';

  return (
    <div className="flex flex-col gap-lg">
      {showToggle && (
        <div className="disco-tabs" role="tablist">
          {([
            { value: 'original', label: 'Original' },
            { value: 'community', label: 'Community' },
          ] as const).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={view === value}
              className={`disco-tab${view === value ? ' selected' : ''}`}
              onClick={() => setView(value)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {activeView === 'original' && (
        <>
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
            <div className="flex flex-col gap-md">
              <h2 className="font-display text-lg">Singles</h2>
              <SongList
                songs={discography.singles}
                onRefetch={refetch}
                toTrack={song => ({
                  id: song._id,
                  title: song.title || 'Untitled',
                  coverUrl: song.cover_url,
                  audioUrl: song.audio_url || '',
                  duration: song.duration,
                  lyrics: song.lyrics,
                  author: song.author,
                  bops: song.bops,
                  artistId: song.artist_id,
                  artistName,
                })}
              />
            </div>
          )}
        </>
      )}

      {activeView === 'community' && (
        <div className="flex flex-col gap-md">
          <h2 className="font-display text-lg">Mixtapes</h2>
          <div className="grid grid-cols-2 gap-md">
            {discography.mixtapes.map(mixtape => (
              <AlbumCard
                key={mixtape._id}
                coverUrl={mixtape.cover_url}
                title={mixtape.title || 'Untitled'}
                onClick={() => navigate(`/mixtapes/${mixtape._id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
