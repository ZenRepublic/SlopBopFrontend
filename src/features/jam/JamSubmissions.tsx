import type { RequestStatus } from '../../services/slopbop';
import SongWriter from '../../components/songwriter/SongWriter';

interface Props {
  mixtapeId: string;
  artistName?: string;
  status: RequestStatus;
  /** Refetch the mixtape so the window is re-evaluated (a 409 closes it, or the
   * final slot fills). */
  refresh: () => void;
}

// Song submissions for a mixtape — the free, always-open counterpart to the
// album's staged Submissions. There's no window or deadline: intake stays open
// until capacity, and songs land one at a time as they're produced (so this sits
// *below* the song list rather than replacing it). Its states:
//
//   open (count < max) → intro + the generic form card
//   full  → a "tape is full" notice
//   otherwise          → nothing (e.g. not yet configured with max_tracks)
//
// Owns its own top divider so hiding it also removes the divider.
export default function MixtapeSubmissions({ mixtapeId, artistName, status, refresh }: Props) {
  let body: React.ReactNode = null;
  if (status.open) {
    // Intro copy sits above the generic form card (which carries the count
    // header). No deadline strip — a mixtape has no window, just capacity. And
    // no oncePerDevice: submit as many songs as there are slots left.
    body = (
      <div className="flex flex-col gap-md">
        <p className="text-sm text-secondary leading-relaxed">
          Help {artistName ?? 'this artist'} create their next viral song!
        </p>
        <p className="text-sm text-secondary leading-relaxed">
          Write down the lyrics and a song will show up as soon as they produce
          it. The most popular song in the mixtape will become a fresh Single,
          while the rest will perish…
        </p>

        <SongWriter
          collectionId={mixtapeId}
          trackCount={status.track_count}
          maxTracks={status.max_tracks}
          refresh={refresh}
        />
      </div>
    );
  } else if (status.reason === 'full') {
    body = (
      <div className="frosted-card flex flex-col items-center gap-xs text-center py-sm">
        <span className="text-2xl">🎤</span>
        <p className="text-sm font-semibold text-accent">This mixtape is full!</p>
        <p className="text-xs text-muted">All {status.max_tracks} slots have been taken.</p>
      </div>
    );
  }

  if (!body) return null;

  return (
    <>
      <div className="border-t border-divider" />
      {body}
    </>
  );
}
