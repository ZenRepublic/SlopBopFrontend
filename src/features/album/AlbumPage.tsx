import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAlbum } from '../../hooks/useAlbum';
import { useArtist } from '../../hooks/useArtist';
import SongList from '../../components/songlist/SongList';
import Img from '../../primitives/Img';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/**
 * An album — the artist's own record, and the plainest of the three collection
 * pages: cover, credit line, tracklist, nothing else. It's the only one reached
 * from the Discography, because it's the only one that's part of the catalogue.
 *
 * Everything crowdsourced is deliberately absent. No submission panel (an album
 * has no `request_status` to gate one on), no deadline strip, and no QR toggle —
 * the QR exists so a room can scan in and write, which is a commission mechanic.
 *
 * It does get its own background though: the twirl is "the thing a room paid
 * for" (see album-world.css), and the album is the record they came away with.
 */
export default function AlbumPage() {
  const { id } = useParams<{ id: string }>();
  const { album, songs, loading: albumLoading, refetch } = useAlbum(id ?? '');
  const { artist, loading: artistLoading } = useArtist(album?.artist_id ?? '');

  // Swap the app's diagonal stripes for the album's twirl for as long as this
  // page is mounted (styles/components/album-world.css). Above the early returns
  // so the loading and not-found states land in the same world.
  useEffect(() => {
    document.body.classList.add('album-world');
    return () => document.body.classList.remove('album-world');
  }, []);

  const loading = albumLoading || artistLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner large processing" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted">Album not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="relative w-full aspect-square">
        <Img
          src={album.cover_url || '/Images/default_song_cover.png'}
          alt={album.title}
          className="w-full h-full"
        />
      </div>

      <div className="flex flex-col gap-xs p-lg">
        <h1 className="font-display text-xl">{album.title || 'Untitled'}</h1>
        <p className="text-sm ml-md">
          Album by{' '}
          <Link
            to={`/artists/${artist?.artist_id}`}
            className="underline"
          >
            {artist?.name ?? 'Unknown'}
          </Link>
          {album.created_at && <> | {formatDate(album.created_at)}</>}
        </p>
      </div>

      <div className="flex flex-col gap-lg px-lg pb-lg">
        <SongList
          songs={songs}
          onRefetch={refetch}
          toTrack={song => ({
            id: song._id,
            title: song.title || 'Untitled',
            coverUrl: song.cover_url || album.cover_url,
            audioUrl: song.audio_url || '',
            duration: song.duration,
            lyrics: song.lyrics,
            author: song.author,
            stats: song.stats,
            artistId: song.artist_id,
            artistName: artist?.name,
          })}
        />
      </div>
    </div>
  );
}
