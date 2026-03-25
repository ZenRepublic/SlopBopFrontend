import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Track {
  title: string;
  coverUrl?: string;
  audioUrl: string;
  duration?: number;
  lyrics?: string;
}

interface MusicPlayerContextValue {
  track: Track | null;
  play: (track: Track) => void;
  close: () => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextValue | null>(null);

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const [track, setTrack] = useState<Track | null>(null);

  const play = useCallback((t: Track) => setTrack(t), []);
  const close = useCallback(() => setTrack(null), []);

  return (
    <MusicPlayerContext.Provider value={{ track, play, close }}>
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) throw new Error('useMusicPlayer must be used within MusicPlayerProvider');
  return ctx;
}