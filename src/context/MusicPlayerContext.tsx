import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
} from 'react';
import { useToast } from './ToastContext';
import {
  ARWEAVE_MAX_RETRIES,
  ARWEAVE_RETRY_DELAY_MS,
  ARWEAVE_STALL_SILENCE_MS,
} from '../config/arweave';

export interface Track {
  id: string;
  title: string;
  coverUrl?: string;
  audioUrl: string;
  duration?: number;
  lyrics?: string;
  author?: string;
  /** Seeds the player's bop count — see `useSongBop`. Absent reads as 0. */
  bops?: number;
  artistId?: string;
  artistName?: string;
}

interface MusicPlayerContextValue {
  track: Track | null;
  playing: boolean;
  loading: boolean;
  currentTime: number;
  duration: number;
  expanded: boolean;
  hasNext: boolean;
  hasPrev: boolean;
  play: (track: Track) => void;
  playQueue: (tracks: Track[], startIndex?: number) => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  skip: (delta: number) => void;
  next: () => void;
  prev: () => void;
  expand: () => void;
  collapse: () => void;
  close: () => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextValue | null>(null);


export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [expanded, setExpanded] = useState(false);

  // The active queue is a snapshot taken at play() time. Held in refs (not
  // state) so the `ended` handler — registered once on mount — can advance it
  // without going stale, and so re-sorting the source list can't disturb it.
  const queueRef = useRef<Track[]>([]);
  const indexRef = useRef(0);

  // …but the position also has to be *rendered* (the prev/next stickers appear
  // and disappear with it), and refs don't re-render. Mirrored into state, which
  // only ever changes when the queue or the index does — go() owns both.
  const [queueIndex, setQueueIndex] = useState(0);
  const [queueLength, setQueueLength] = useState(0);

  // Bookkeeping for the load/retry cycle. Refs, not state: the mount effect's
  // listeners are registered once and have to see current values.
  const attemptsRef = useRef(0);
  const trackRef = useRef<Track | null>(null);
  const retryTimerRef = useRef<number | undefined>(undefined);
  const stallTimerRef = useRef<number | undefined>(undefined);
  const attemptRef = useRef<() => void>(() => {});

  const clearTimers = useCallback(() => {
    window.clearTimeout(retryTimerRef.current);
    window.clearTimeout(stallTimerRef.current);
    retryTimerRef.current = undefined;
    stallTimerRef.current = undefined;
  }, []);

  // Surface a failed play() instead of swallowing it. This is for *resuming* a
  // track that already loaded — a failed load goes through retryOrFail instead.
  // AbortError is the one exception: it just means a newer load superseded this.
  const handlePlayError = useCallback((err: unknown) => {
    setPlaying(false);
    setLoading(false);
    if ((err as DOMException)?.name !== 'AbortError') {
      showToast("Couldn't play this song — check your connection and try again.");
    }
  }, [showToast]);

  // A load failed or went silent (see `config/arweave` for why that happens as
  // often as it does). Retry without telling anyone: `loading` stays true across
  // the gap, so the spinner never stops and nobody is asked to press play again.
  // Only once the budget is spent does this surface an error.
  const retryOrFail = useCallback((message: string) => {
    clearTimers();
    if (attemptsRef.current >= ARWEAVE_MAX_RETRIES) {
      setPlaying(false);
      setLoading(false);
      showToast(message);
      return;
    }
    attemptsRef.current += 1;
    setLoading(true);
    retryTimerRef.current = window.setTimeout(
      () => attemptRef.current(),
      ARWEAVE_RETRY_DELAY_MS,
    );
  }, [clearTimers, showToast]);

  // (Re)start the silence watchdog: armed when a load begins, pushed forward by
  // every `progress` event, cleared once the element says it can play. Measures
  // silence rather than elapsed time, so a slow connection is never cut off.
  const armStallWatchdog = useCallback(() => {
    window.clearTimeout(stallTimerRef.current);
    stallTimerRef.current = window.setTimeout(
      () => retryOrFail("Couldn't load this song — check your connection and try again."),
      ARWEAVE_STALL_SILENCE_MS,
    );
  }, [retryOrFail]);

  // One load attempt at whatever `trackRef` holds. Split out from loadAndPlay so
  // a retry re-runs exactly this without resetting the attempt counter.
  //
  // Re-assigning `src` is the whole point of it: that's what re-runs the media
  // load algorithm. play() alone can't — after a failed load the element sits in
  // NETWORK_NO_SOURCE with `error` set, and can only reject again.
  const attempt = useCallback(() => {
    const audio = audioRef.current;
    const t = trackRef.current;
    if (!audio || !t) return;
    clearTimers();
    setLoading(true);
    audio.src = t.audioUrl;
    armStallWatchdog();
    // Start within the user gesture so autoplay policy doesn't block it.
    audio.play().catch(err => {
      if ((err as DOMException)?.name === 'AbortError') return; // superseded
      retryOrFail("Couldn't play this song — check your connection and try again.");
    });
  }, [clearTimers, armStallWatchdog, retryOrFail]);

  // The retry timer fires long after the render that scheduled it, so it reaches
  // `attempt` through a ref rather than closing over a stale copy.
  useEffect(() => {
    attemptRef.current = attempt;
  }, [attempt]);

  // Load a track into the audio element and start it. Stable so the mount
  // effect's `ended` handler can call it to auto-advance the queue.
  const loadAndPlay = useCallback((t: Track) => {
    if (!audioRef.current) return;
    trackRef.current = t;
    attemptsRef.current = 0;
    setTrack(t);
    setCurrentTime(0);
    setDuration(t.duration ?? 0);
    setPlaying(true);
    attempt();
  }, [attempt]);

  // Jump to a queue position. The single place the index moves, so the ref and
  // the rendered mirror can't drift apart. Out-of-range is a no-op.
  const go = useCallback((i: number) => {
    if (i < 0 || i >= queueRef.current.length) return;
    indexRef.current = i;
    setQueueIndex(i);
    loadAndPlay(queueRef.current[i]);
  }, [loadAndPlay]);

  // Create a persistent audio element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    // Advance to the next queued track, or stop at the end of the queue.
    const onEnded = () => {
      if (indexRef.current + 1 < queueRef.current.length) {
        go(indexRef.current + 1);
      } else {
        setPlaying(false);
      }
    };
    // Buffering / readiness — these drive the loading indicator. Reaching either
    // of the ready states means the load landed: stand the watchdog down and give
    // the track its full retry budget back for whatever happens next.
    const onWaiting = () => setLoading(true);
    const onReady = () => {
      clearTimers();
      attemptsRef.current = 0;
      setLoading(false);
    };
    // Bytes arrived, so the load isn't silent — push the watchdog out. Guarded on
    // the timer being armed, so mid-playback buffering doesn't start a new one.
    const onProgress = () => {
      if (stallTimerRef.current !== undefined) armStallWatchdog();
    };
    // Mirror the element's own play state, so the button stays honest when
    // playback stops for reasons we never initiated (OS interruption, etc).
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    // A failed load, which is usually the gateway blipping rather than anything
    // wrong with the song — retry before it ever becomes the user's problem.
    const onError = () =>
      retryOrFail("Couldn't load this song — check your connection and try again.");

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('progress', onProgress);
    audio.addEventListener('playing', onReady);
    audio.addEventListener('canplay', onReady);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('progress', onProgress);
      audio.removeEventListener('playing', onReady);
      audio.removeEventListener('canplay', onReady);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
      clearTimers();
      audio.pause();
    };
    // Every dependency is stable, so the audio element is still set up once.
  }, [go, clearTimers, retryOrFail, armStallWatchdog]);

  // Play an ordered list as a queue, starting at `startIndex`; each track
  // auto-advances to the next when it ends.
  //
  // `startIndex` is a playhead position, not a slice point — callers pass the
  // *whole* list they're rendering and the row that was pressed, so pressing
  // row 4 leaves rows 1-3 behind the playhead and prev/next can walk the full
  // list either way. This is what makes the queue de-facto songlist-shaped:
  // whatever list you press in becomes the queue, replacing the previous one.
  //
  // The list is snapshotted here, so the caller re-sorting/filtering its source
  // afterwards won't affect what's playing — a new queue only forms on the next
  // playQueue() call. Trade-off: re-sorting mid-playback leaves prev/next
  // walking the order that was on screen when playback started.
  const playQueue = useCallback((tracks: Track[], startIndex = 0) => {
    if (!tracks.length) return;
    queueRef.current = tracks;
    setQueueLength(tracks.length);
    setExpanded(false);
    go(Math.max(0, Math.min(startIndex, tracks.length - 1)));
  }, [go]);

  // Convenience: play a single track as a one-item queue.
  const play = useCallback((t: Track) => playQueue([t], 0), [playQueue]);

  // Imperative on purpose: routing play() through state + an effect defers it
  // past the click, and Safari/Firefox reject an out-of-gesture play() when no
  // in-gesture one has succeeded yet. Reads `paused` off the element, not our
  // mirrored state, so a stale flag can't pick the wrong branch.
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    // A load that failed for good leaves the element with `error` set and no
    // source, where play() can only reject — so pressing play would just replay
    // the same error forever, and only a page reload ever fixed it. Re-run the
    // load instead, with a fresh budget: the button is a real retry.
    if (audio.error || audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
      attemptsRef.current = 0;
      setPlaying(true);
      attempt();
      return;
    }
    setPlaying(true);
    audio.play().catch(handlePlayError);
  }, [track, attempt, handlePlayError]);

  const next = useCallback(() => go(indexRef.current + 1), [go]);
  const prev = useCallback(() => go(indexRef.current - 1), [go]);

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
    // Drop any retry in flight — a closed player must not resurrect itself.
    clearTimers();
    trackRef.current = null;
    attemptsRef.current = 0;
    queueRef.current = [];
    indexRef.current = 0;
    setQueueIndex(0);
    setQueueLength(0);
    setPlaying(false);
    setLoading(false);
    setCurrentTime(0);
    setTrack(null);
    setExpanded(false);
  }, [clearTimers]);

  return (
    <MusicPlayerContext.Provider
      value={{
        track,
        playing,
        loading,
        currentTime,
        duration,
        expanded,
        hasNext: queueIndex < queueLength - 1,
        hasPrev: queueIndex > 0,
        play,
        playQueue,
        togglePlay,
        seek,
        skip,
        next,
        prev,
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
