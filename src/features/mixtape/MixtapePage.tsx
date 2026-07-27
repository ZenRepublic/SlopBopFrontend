import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAlbum } from '../../hooks/useAlbum';
import { useArtist } from '../../hooks/useArtist';
import SongList from '../../components/songlist/SongList';
import Img from '../../primitives/Img';
import Submissions from './Submissions';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function AlbumPage() {
  const { id } = useParams<{ id: string }>();
  const { album, songs, requestStatus, loading: albumLoading, refetch } = useAlbum(id ?? '');
  const { artist, loading: artistLoading } = useArtist(album?.artist_id ?? '');

  // Toggles the cover image out for a QR code pointing at this same page, so a
  // host can put the album on screen and let a room scan their way in.
  const [showQR, setShowQR] = useState(false);

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
        {showQR ? (
          <div className="w-full h-full flex items-center justify-center bg-white p-lg">
            <QRCodeSVG
              value={window.location.href}
              level="M"
              marginSize={2}
              className="w-full h-full"
            />
          </div>
        ) : (
          <Img
            src={album.cover_url || '/Images/default_song_cover.png'}
            alt={album.title}
            className="w-full h-full"
          />
        )}
        <button
          type="button"
          onClick={() => setShowQR(v => !v)}
          aria-pressed={showQR}
          aria-label="Toggle QR code"
          className={`absolute top-sm right-sm rounded px-xs text-xs font-bold transition-colors ${
            showQR ? 'text-accent' : 'text-white/40 hover:text-white/80'
          }`}
        >
          QR
        </button>
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

        {requestStatus && (
          <Submissions
            albumId={album._id}
            artistName={artist?.name}
            status={requestStatus}
            songCount={songs.length}
            refresh={refetch}
          />
        )}
      </div>
    </div>
  );
}
