import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useMixtape } from '../../hooks/useMixtape';
import { useArtist } from '../../hooks/useArtist';
import SongList from '../../components/songlist/SongList';
import Img from '../../primitives/Img';
import MixtapeSubmissions from './MixtapeSubmissions';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function MixtapePage() {
  const { id } = useParams<{ id: string }>();
  const { mixtape, songs, requestStatus, loading: mixtapeLoading, refetch } = useMixtape(id ?? '');
  const { artist, loading: artistLoading } = useArtist(mixtape?.artist_id ?? '');

  // Toggles the cover image out for a QR code pointing at this same page, so a
  // host can flash the mixtape on screen and let people scan in to submit.
  const [showQR, setShowQR] = useState(false);

  // Swap the app's diagonal stripes for the demo world — an unfinished skin with
  // the code showing through (styles/components/mixtape-world.css). Above the
  // early returns so the loading and not-found states land in the same world.
  useEffect(() => {
    document.body.classList.add('mixtape-world');
    return () => document.body.classList.remove('mixtape-world');
  }, []);

  const loading = mixtapeLoading || artistLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner large processing" />
      </div>
    );
  }

  if (!mixtape) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted">Mixtape not found</p>
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
            src={mixtape.cover_url || '/Images/default_song_cover.png'}
            alt={mixtape.title}
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
        <h1 className="font-display text-xl">{mixtape.title || 'Untitled'}</h1>
        <p className="text-sm ml-md">
          Mixtape by{' '}
          <Link
            to={`/artists/${artist?.artist_id}`}
            className="underline"
          >
            {artist?.name ?? 'Unknown'}
          </Link>
          {mixtape.created_at && <> | {formatDate(mixtape.created_at)}</>}
        </p>
      </div>

      <div className="flex flex-col gap-lg px-lg pb-lg">
        {/* Songs first, and always shown: mixtape tracks drip in one at a time as
            each submission is recorded, not as a batch — so there's no "before
            release" phase to hide. */}
        <SongList
          songs={songs}
          onRefetch={refetch}
          toTrack={song => ({
            id: song._id,
            title: song.title || 'Untitled',
            coverUrl: song.cover_url || mixtape.cover_url,
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
          <MixtapeSubmissions
            mixtapeId={mixtape._id}
            artistName={artist?.name}
            status={requestStatus}
            refresh={refetch}
          />
        )}
      </div>
    </div>
  );
}
