import type { RequestStatus } from '../../services/slopbop';
import SongWriter from '../../components/songwriter/SongWriter';
import DeadlineStrip from '../../components/DeadlineStrip';

interface Props {
  jamId: string;
  artistName?: string;
  status: RequestStatus;
  /** Refetch the jam so the window is re-evaluated (the deadline hits, a 409
   * closes it, or the final slot fills). */
  refresh: () => void;
}

// Song submissions for a jam — the mixtape's louder sibling. A jam closes on
// whichever comes first, filling up or running out of days, so it shows both the
// capacity gauge (inside the form card) and the deadline strip. Its states:
//
//   open             → the pitch, the countdown, and the form card
//   full             → a "tape is full" notice
//   deadline_passed  → submissions are over; the artist is choosing
//   otherwise        → nothing (e.g. never configured with max_tracks)
//
// Owns its own top divider so hiding it also removes the divider.
export default function JamSubmissions({ jamId, artistName, status, refresh }: Props) {
  const artist = artistName ?? 'this artist';

  let body: React.ReactNode = null;
  if (status.open) {
    // The pitch sits above the generic form card (which carries the count
    // header). No oncePerDevice: submit as many songs as there are slots left.
    body = (
      <div className="flex flex-col gap-md">
        <p className="text-sm leading-relaxed">
          This week we have {artist} on the mic, jamming on the{' '}
          <span className="text-accent">songs that you write</span>.
        </p>
        <p className="text-sm leading-relaxed">
          At the end of the jam one song gets upgraded into a proper Single, while
          the rest will perish…
        </p>

        {status.submission_deadline && (
          <DeadlineStrip deadline={status.submission_deadline} onExpire={refresh} />
        )}

        <SongWriter
          collectionId={jamId}
          status={status}
          refresh={refresh}
        />
      </div>
    );
  } else if (status.reason === 'full') {
    body = (
      <div className="frosted-card flex flex-col items-center gap-xs text-center py-sm">
        <span className="text-2xl">🎤</span>
        <p className="text-sm font-semibold text-accent">This jam is full!</p>
        <p className="text-xs text-muted">All {status.max_tracks} slots have been taken.</p>
      </div>
    );
  } else if (status.reason === 'deadline_passed') {
    // The jam ran its days out. Which of the two post-deadline phases it's in —
    // the artist still choosing, or a winner already crowned — is `jam_status`'s
    // answer, not this component's; it only explains why the form is gone.
    body = (
      <div className="frosted-card flex flex-col items-center gap-xs text-center py-sm">
        <span className="text-2xl">🏆</span>
        <p className="text-sm font-semibold text-accent">The jam is over!</p>
        <p className="text-xs text-muted">{artist} is picking the song that survives.</p>
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
