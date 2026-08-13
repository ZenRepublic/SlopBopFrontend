import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useJam } from '../../hooks/collections';
import { useSong } from '../../hooks/songs';
import { useArtist } from '../../hooks/artists';
import { songCredit, type Song } from '../../services/slopbop';
import SongList from '../../components/songlist/SongList';
import Img from '../../primitives/Img';
import JamSubmissions from './JamSubmissions';
import JamWinner from './JamWinner';

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
  const { jam, songs, requestStatus, jamStatus, loading: jamLoading, refetch } = useJam(id ?? '');
  const { artist, loading: artistLoading } = useArtist(jam?.artist_id ?? '');
  // A resolved jam comes back with `songs: []` — the winner was promoted out of
  // the collection and the also-rans deleted — so the one song worth showing is
  // the one thing the jam's own read can't hand us. An empty id is idle, which
  // is every other phase.
  const { song: winner } = useSong(jamStatus?.selected_song_id ?? '');

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

  // `!jam` and not just `loading`: an open jam polls itself for the live
  // standings, and each poll raises `loading` again — spinnering on that would
  // blank the page every 30 seconds.
  const loading = (jamLoading && !jam) || artistLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner large processing" />
      </div>
    );
  }

  const resolved = jamStatus?.phase === 'resolved';
  // Still being fought over — submissions in, nothing settled. Both phases show
  // the standings, because bops carry on counting right up to the tally.
  const live = jamStatus?.phase === 'open' || jamStatus?.phase === 'awaiting_resolution';

  if (!jam) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted">Jam not found</p>
      </div>
    );
  }

  // Every list on this page reads the same way — including the promoted winner,
  // which inherited the jam's cover on its way out.
  const toTrack = (song: Song) => ({
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
  });

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
            release" phase to hide.

            While the jam runs, the list IS the scoreboard: bops decide the
            winner outright, so it opens most-bopped-first. Nothing explains that
            here — the intro and the tracklist sit directly against each other,
            and a line of copy wedged between them reads as clutter. The
            submissions panel below is where the rules get stated.

            Once a song has won the list is the wrong shape entirely — there's
            exactly one left and nothing to compare it against — so `JamWinner`
            takes over. */}
        {resolved ? (
          winner && <JamWinner song={winner} toTrack={toTrack} />
        ) : (
          <SongList
            songs={songs}
            onRefetch={refetch}
            toTrack={toTrack}
            defaultSort={live ? 'bops-desc' : 'release'}
          />
        )}

        {requestStatus && jamStatus && (
          <JamSubmissions
            jamId={jam._id}
            artistName={artist?.name}
            status={requestStatus}
            phase={jamStatus.phase}
            refresh={refetch}
          />
        )}

        {/* Nobody entered, so there's no winner and no tracklist. Saying so is
            the page's last job — an empty list with no explanation reads as a
            page that failed to load. */}
        {jamStatus?.phase === 'closed' && (
          <>
            <div className="border-t border-divider" />
            <div className="frosted-card flex flex-col items-center gap-xs text-center py-sm">
              <span className="text-2xl">🥀</span>
              <p className="text-sm font-semibold">This jam ended empty.</p>
              <p className="text-xs text-muted">Nobody wrote a song in time — no Single from this one.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
