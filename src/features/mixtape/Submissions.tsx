import type { RequestStatus } from '../../services/slopbop';
import SongWriter from '../../components/songwriter/SongWriter';
import DeadlineStrip from '../../components/DeadlineStrip';
import { Countdown } from '../../primitives/Countdown';

interface Props {
  mixtapeId: string;
  artistName?: string;
  status: RequestStatus;
  /** Number of songs published on the mixtape (released or upcoming). Once the
   * first one exists, submissions are done and the whole panel hides. */
  songCount: number;
  /** Refetch the mixtape so the window is re-evaluated (start/deadline hits, or a
   * 409 closes it). */
  refresh: () => void;
}

// Song submissions for this mixtape, rendered on the mixtape page. Its lifecycle:
//
//   window open        → intro + deadline strip + form card
//   window not started → countdown to the opening
//   closed, songs → 0  → "being produced" wait (submissions came in, no song yet)
//   first song exists  → nothing at all (its job is done)
//   never any activity → nothing at all
//
// Owns its own top divider so that hiding it also removes the divider — the mixtape
// page just drops <Submissions/> in and lets it decide whether to show.
export default function Submissions({ mixtapeId, artistName, status, songCount, refresh }: Props) {
  let body: React.ReactNode = null;
  if (songCount > 0) {
    // First song is published — the submission phase is over. Render nothing.
    body = null;
  } else if (status.open) {
    // Intro copy and the deadline strip sit *above* the form card, which is a
    // generic self-contained card (count header + fields). Keeping them out is
    // what lets the same card serve mixtapes and jams. A mixtape is one song
    // per guest, hence oncePerDevice.
    body = (
      <div className="flex flex-col gap-md">
        <p className="text-sm leading-relaxed">
          Help {artistName ?? 'this artist'} produce this mixtape by submitting a
          song with your own custom lyrics.
        </p>
        {status.submission_deadline && (
          <DeadlineStrip deadline={status.submission_deadline} onExpire={refresh} />
        )}
        <SongWriter
          collectionId={mixtapeId}
          status={status}
          oncePerDevice
          refresh={refresh}
        />
      </div>
    );
  } else if (status.reason === 'not_started') {
    body = <div className="frosted-card"><PendingNotice status={status} onStart={refresh} /></div>;
  } else if (status.track_count > 0) {
    // Closed with submissions in hand but no song published yet — the production
    // wait before the first track is generated.
    body = <div className="frosted-card"><ProducingNotice /></div>;
  }

  if (!body) return null;

  return (
    <>
      <div className="border-t border-divider" />
      {body}
    </>
  );
}

// The window is configured but hasn't opened yet. Show a countdown to the start;
// when it elapses, refresh so the form takes over.
function PendingNotice({ status, onStart }: { status: RequestStatus; onStart: () => void }) {
  return (
    <div className="flex flex-col items-center gap-sm text-center">
      <p className="text-sm leading-relaxed">
        The song submissions for this mixtape opens in…
      </p>
      {status.submission_start ? (
        <Countdown
          target={status.submission_start}
          onExpire={onStart}
          render={r => (
            <span className="text-2xl font-bold text-accent">{r}</span>
          )}
        />
      ) : (
        <p className="text-xs text-muted">Check back soon.</p>
      )}
    </div>
  );
}

// Submissions are in and closed, but no song has been generated yet — the mixtape
// is being produced. Disappears entirely once the first song publishes.
function ProducingNotice() {
  return (
    <div className="flex flex-col items-center gap-md text-center py-sm">
      <div className="spinner large processing" />
      <p className="text-sm leading-relaxed">
        The mixtape is being produced — hang tight!
      </p>
    </div>
  );
}
