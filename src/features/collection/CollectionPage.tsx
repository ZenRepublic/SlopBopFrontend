import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { useCollection } from '../../hooks/useCollection';
import { useArtist } from '../../hooks/useArtist';
import { useAdmin } from '../../hooks/useAdmin';
import { useRecordingMode } from '../../hooks/useRecordingMode';
import { useGenerateSong } from '../../hooks/useGenerateSong';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import { useToast } from '../../context/ToastContext';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTH_NAMES[d.getMonth()] } ${d.getFullYear()}`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function CollectionPage() {
  const { id } = useParams<{ id: string }>();
  const { collection, songs, loading: collectionLoading, refetch } = useCollection(id ?? '');
  const { artist, loading: artistLoading } = useArtist(collection?.artistId ?? '');
  const { play } = useMusicPlayer();
  const { connected } = useWallet();
  const { isAdmin } = useAdmin();
  const { toggleRecording, loading: recordingLoading } = useRecordingMode();
  const { generate, loading: generating } = useGenerateSong();
  const { showToast } = useToast();
  const [theme, setTheme] = useState('');

  const loading = collectionLoading || artistLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner large processing" />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-secondary">Collection not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {collection.isRecording && (
        <div className="flex items-center justify-center gap-sm bg-[var(--red)] py-sm px-lg live-recording-banner">
          <span className="w-3 h-3 rounded-full bg-white recording-dot flex-shrink-0" />
          <p className="text-sm font-bold tracking-wide text-white">LIVE RECORDING</p>
        </div>
      )}

      <img
        src={collection.coverUrl || '/Images/default_song_cover.png'}
        alt={collection.title}
        className="w-full aspect-square object-cover"
      />

      <div className="flex flex-col gap-xs p-lg">
        <h1 className="font-display text-xl">{collection.title || 'Untitled'}</h1>
        <p className="text-sm ml-md">
          {collection.collectionType} by{' '}
          <Link
            to={`/artists/${artist?._id}`}
            className="underline"
          >
            {artist?.nickname ?? 'Unknown'}
          </Link>
          {collection.createdAt && <> | {formatDate(collection.createdAt)}</>}
        </p>
      </div>

      <div className="flex flex-col px-lg pb-lg">
        <div className="flex items-center gap-sm px-sm py-xs text-xs">
          <p className="w-6 text-center">#</p>
          <p className="flex-1">Title</p>
          <p className="flex-shrink-0">Duration</p>
        </div>

        <div className="flex flex-col bg-[var(--bg-secondary)] rounded-lg p-sm">
          {songs.map((song, i) => (
            <div key={song._id}>
              {i > 0 && <div className="border-t border-white/10 my-xs" />}
              <button
                type="button"
                onClick={() => play({
                  id: song._id,
                  title: song.title || 'Untitled',
                  coverUrl: song.coverUrl || collection.coverUrl,
                  audioUrl: song.audioUrl || '',
                  duration: song.duration,
                  lyrics: song.lyrics,
                  stats: song.stats,
                })}
                className="flex items-center gap-sm w-full text-left cursor-pointer
                           active:opacity-70 transition-base px-sm py-xs"
              >
                <span className="w-6 text-center text-sm text-secondary">{i + 1}</span>
                <p className="text-sm truncate flex-1">{song.title || 'Untitled'}</p>
                {song.duration != null && (
                  <span className="text-sm text-secondary flex-shrink-0">
                    {formatDuration(song.duration)}
                  </span>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {collection.isRecording && (
        <div className="flex flex-col gap-sm px-lg pb-lg">
          <textarea
            maxLength={50}
            rows={2}
            value={theme}
            onChange={e => setTheme(e.target.value)}
            placeholder="What should I sing about?"
            disabled={generating || !connected}
            className="w-full resize-none light"
          />
          <div className="flex justify-end">
            <button
              className="special"
              disabled={generating || !theme.trim() || !connected}
              onClick={() =>
                generate(collection.artistId, theme.trim(), collection._id)
                  .then(() => { setTheme(''); showToast('Song creation started successfully', 'success'); })
                  .catch(() => showToast('Failed to generate song'))
              }
            >
              {generating ? 'CREATING...' : 'CREATE'}
            </button>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="px-lg">
          <button
            className={collection.isRecording ? 'back full-width' : 'special full-width'}
            disabled={recordingLoading}
            onClick={() => toggleRecording(collection._id, !collection.isRecording).then(refetch)}
          >
            {recordingLoading ? 'UPDATING...' : collection.isRecording ? 'STOP RECORDING' : 'START RECORDING'}
          </button>
        </div>
      )}

    </div>
  );
}
