import { useRef, useState, useEffect, useCallback } from 'react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function MusicPlayer() {
  const { track, close } = useMusicPlayer();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Reset state when track changes
  useEffect(() => {
    if (!track) return;
    setPlaying(false);
    setCurrentTime(0);
    setDuration(track.duration ?? 0);
  }, [track]);

  // Wire up audio element events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [track]);

  // Play/pause sync
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (playing) {
      audio.play();
    } else {
      audio.pause();
    }
  }, [playing, track]);

  const togglePlay = useCallback(() => setPlaying(p => !p), []);

  const skip = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.currentTime + delta, audio.duration || 0));
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = Number(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const handleClose = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlaying(false);
    close();
  }, [close]);

  if (!track) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] bg-[var(--bg-primary)] overflow-y-auto">
      {/* Hidden audio element */}
      <audio ref={audioRef} src={track.audioUrl} preload="metadata" />

      {/* Close button */}
      <div className="flex justify-end p-lg">
        <button type="button" onClick={handleClose} className="cursor-pointer">
          <img src="/Icons/CloseIcon.PNG" alt="Close" className="w-6 h-6" />
        </button>
      </div>

      {/* Cover art */}
      <div className="flex items-center justify-center px-xl">
        <img
          src={track.coverUrl || '/Images/default_song_cover.png'}
          alt={track.title}
          className="w-full max-w-[320px] aspect-square object-cover rounded-lg"
        />
      </div>

      {/* Title */}
      <p className="text-center text-base font-bold px-lg truncate mt-lg">{track.title}</p>

      {/* Controls + slider */}
      <div className="flex flex-col gap-md p-xl">
        {/* Playback controls */}
        <div className="flex items-center justify-center gap-3xl">
          <button
            type="button"
            onClick={() => skip(-15)}
            className="text-secondary text-sm font-bold cursor-pointer active:scale-90 transition-base"
          >
            -15s
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className="w-14 h-14 rounded-full bg-white flex items-center justify-center cursor-pointer
                       active:scale-90 transition-base"
          >
            {playing ? (
              /* Pause icon */
              <svg viewBox="0 0 24 24" fill="var(--black)" className="w-7 h-7">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              /* Play icon */
              <svg viewBox="0 0 24 24" fill="var(--black)" className="w-7 h-7 ml-1">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={() => skip(15)}
            className="text-secondary text-sm font-bold cursor-pointer active:scale-90 transition-base"
          >
            +15s
          </button>
        </div>

        {/* Progress slider */}
        <div className="flex flex-col gap-xs">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="music-player-slider w-full"
            style={{ '--progress': `${progress}%` } as React.CSSProperties}
          />
          <div className="flex justify-between text-xs text-secondary">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* Lyrics */}
      {track.lyrics && (
        <div className="px-xl pb-3xl">
          <h3 className="font-display text-lg mb-md">Lyrics</h3>
          <p className="text-sm text-secondary whitespace-pre-line leading-relaxed">
            {track.lyrics}
          </p>
        </div>
      )}
    </div>
  );
}