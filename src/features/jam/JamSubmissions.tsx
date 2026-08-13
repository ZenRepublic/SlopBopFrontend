import type { JamPhase, RequestStatus } from '../../services/slopbop';
import SongWriter from '../../components/songwriter/SongWriter';
import DeadlineStrip from '../../components/DeadlineStrip';
import { Countdown } from '../../primitives/Countdown';

interface Props {
  jamId: string;
  artistName?: string;
  status: RequestStatus;
  /** Where the event has got to. It picks which state below is on screen; only
   *  `status.open` decides whether the form is inside it. */
  phase: JamPhase;
  /** Refetch the jam so the window is re-evaluated (a countdown hits, a 409
   * closes it, or the final slot fills). */
  refresh: () => void;
}

// Song submissions for a jam — the mixtape's louder sibling. A jam closes on
// whichever comes first, filling up or running out of days, so it shows both the
// capacity gauge (inside the form card) and the deadline strip.
//
// The two statuses split the work and don't overlap. `phase` picks the state;
// `status.open` decides only whether the form is in it — a jam that filled early
// is still in its `open` phase with the door shut, which is exactly the pair the
// "tape is full" state is made of. Its states:
//
//   scheduled            → countdown to the opening
//   open, door open      → the pitch, the closing countdown, and the form card
//   open, filled up      → a "tape is full" notice
//   awaiting_resolution  → submissions are over; the bops are being counted
//   resolved / closed    → nothing — the page shows the winner, or says there
//                          wasn't one
//   anything else        → nothing (e.g. never configured with max_tracks)
//
// Owns its own top divider so hiding it also removes the divider.
export default function JamSubmissions({ jamId, artistName, status, phase, refresh }: Props) {
  const artist = artistName ?? 'this artist';

  let body: React.ReactNode = null;
  if (phase === 'scheduled') {
    body = (
      <div className="frosted-card flex flex-col items-center gap-sm text-center">
        <p className="text-sm leading-relaxed">The jam opens in…</p>
        {status.submission_start ? (
          <Countdown
            target={status.submission_start}
            onExpire={refresh}
            render={r => <span className="text-2xl font-bold text-accent">{r}</span>}
          />
        ) : (
          <p className="text-xs text-muted">Check back soon.</p>
        )}
      </div>
    );
  } else if (phase === 'open' && status.open) {
    // The pitch sits above the generic form card (which carries the count
    // header). One song per device, same as a mixtape — bops settle the jam now,
    // so a device that can file five entries is filing five chances at the
    // Single.
    body = (
      <div className="flex flex-col gap-md">
        <p className="text-sm leading-relaxed">
          We have {artist} on the mic, jamming on the{' '}
          <span className="text-accent">songs that you write</span>.
        </p>
        <p className="text-sm leading-relaxed">
          The most-bopped song gets upgraded into a proper Single, while the rest
          will perish…
        </p>

        {status.submission_deadline && (
          <DeadlineStrip deadline={status.submission_deadline} onExpire={refresh} />
        )}

        <SongWriter
          collectionId={jamId}
          status={status}
          oncePerDevice
          refresh={refresh}
        />
      </div>
    );
  } else if (phase === 'open' && status.reason === 'full') {
    // Inside its days with no room left. Every song is already here, so the
    // thing left to do is vote on them. Still `reason`-gated rather than a bare
    // `else`: a jam that was never given a capacity is also `open` with a shut
    // door, and "all null slots have been taken" is not the thing to say.
    body = (
      <div className="frosted-card flex flex-col items-center gap-xs text-center py-sm">
        <span className="text-2xl">🎤</span>
        <p className="text-sm font-semibold text-accent">This jam is full!</p>
        <p className="text-xs text-muted">
          All {status.max_tracks} slots have been taken — bop the one you want as the Single.
        </p>
      </div>
    );
  } else if (phase === 'awaiting_resolution') {
    body = (
      <div className="frosted-card flex flex-col items-center gap-xs text-center py-sm">
        <span className="text-2xl">🏆</span>
        <p className="text-sm font-semibold text-accent">The jam is over!</p>
        <p className="text-xs text-muted">
          The bops are being counted — the top song becomes {artist}'s next Single.
        </p>
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
