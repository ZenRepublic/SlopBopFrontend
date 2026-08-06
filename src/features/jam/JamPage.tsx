import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useJam } from '../../hooks/useJam';
import { useArtist } from '../../hooks/useArtist';
import { songCredit } from '../../services/slopbop';
import SongList from '../../components/songlist/SongList';
import Img from '../../primitives/Img';
import JamSubmissions from './JamSubmissions';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function JamPage() {
  const { id } = useParams<{ id: string }>();
  const { jam, songs, requestStatus, loading: jamLoading, refetch } = useJam(id ?? '');
  const { artist, loading: artistLoading } = useArtist(jam?.artist_id ?? '');

  // Toggles the cover image out for a QR code pointing at this same page, so a
  // host can flash the jam on screen and let people scan in to submit.
  const [showQR, setShowQR] = useState(false);

  // Swap the app's diagonal stripes for the demo world — an unfinished skin with
  // the code showing through (styles/components/jam-world.css). Above the
  // early returns so the loading and not-found states land in the same world.
  useEffect(() => {
    document.body.classList.add('jam-world');
    return () => document.body.classList.remove('jam-world');
  }, []);

  const loading = jamLoading || artistLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner large processing" />
      </div>
    );
  }

  if (!jam) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted">Jam not found</p>
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
            src={jam.cover_url || '/Images/default_song_cover.png'}
            alt={jam.title}
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
        <h1 className="font-display text-xl">{jam.title || 'Untitled'}</h1>
        <p className="text-sm ml-md">
          Jam by{' '}
          <Link
            to={`/artists/${artist?.artist_id}`}
            className="underline"
          >
            {artist?.name ?? 'Unknown'}
          </Link>
          {jam.released_at && <> | {formatDate(jam.released_at)}</>}
        </p>
      </div>

      <div className="flex flex-col gap-lg px-lg pb-lg">
        {/* Songs first, and always shown: jam tracks drip in one at a time as
            each submission is recorded, not as a batch — so there's no "before
            release" phase to hide. */}
        <SongList
          songs={songs}
          onRefetch={refetch}
          toTrack={song => ({
            id: song._id,
            title: song.title || 'Untitled',
            coverUrl: song.cover_url || jam.cover_url,
            audioUrl: song.audio_url || '',
            duration: song.duration,
            lyrics: song.lyrics,
            author: songCredit(song, artist),
            bops: song.bops,
            artistId: song.artist_id,
            artistName: artist?.name,
          })}
        />

        {requestStatus && (
          <JamSubmissions
            jamId={jam._id}
            artistName={artist?.name}
            status={requestStatus}
            refresh={refetch}
          />
        )}
      </div>
    </div>
  );
}
