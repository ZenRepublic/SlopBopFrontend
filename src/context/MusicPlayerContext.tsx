import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
} from 'react';

export interface TrackStats {
  bops: number;
  slops: number;
  totalVotes: number;
}

export interface Track {
  id: string;
  title: string;
  coverUrl?: string;
  audioUrl: string;
  duration?: number;
  lyrics?: string;
  stats?: TrackStats;
}

interface MusicPlayerContextValue {
  track: Track | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  expanded: boolean;
  play: (track: Track) => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  skip: (delta: number) => void;
  expand: () => void;
  collapse: () => void;
  close: () => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextValue | null>(null);

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [expanded, setExpanded] = useState(false);

  // Create a persistent audio element
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

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
      audio.pause();
    };
  }, []);

  // Sync play/pause with audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (playing) {
      audio.play();
    } else {
      audio.pause();
    }
  }, [playing, track]);

  const play = useCallback((t: Track) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = t.audioUrl;
    audio.currentTime = 0;
    setTrack(t);
    setCurrentTime(0);
    setDuration(t.duration ?? 0);
    setPlaying(true);
    setExpanded(false);
  }, []);

  const togglePlay = useCallback(() => setPlaying((p) => !p), []);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const skip = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.currentTime + delta, audio.duration || 0));
  }, []);

  const expand = useCallback(() => setExpanded(true), []);
  const collapse = useCallback(() => setExpanded(false), []);

  const close = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlaying(false);
    setCurrentTime(0);
    setTrack(null);
    setExpanded(false);
  }, []);

  return (
    <MusicPlayerContext.Provider
      value={{
        track,
        playing,
        currentTime,
        duration,
        expanded,
        play,
        togglePlay,
        seek,
        skip,
        expand,
        collapse,
        close,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) throw new Error('useMusicPlayer must be used within MusicPlayerProvider');
  return ctx;
}
