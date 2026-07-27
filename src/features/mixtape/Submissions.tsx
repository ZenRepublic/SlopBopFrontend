import { useState, useEffect } from 'react';
import type { RequestStatus } from '../../services/slopbop';
import SongWriter from '../../components/songwriter/SongWriter';

interface Props {
  albumId: string;
  artistName?: string;
  status: RequestStatus;
  /** Number of songs published on the album (released or upcoming). Once the
   * first one exists, submissions are done and the whole panel hides. */
  songCount: number;
  /** Refetch the album so the window is re-evaluated (start/deadline hits, or a
   * 409 closes it). */
  refresh: () => void;
}

// Song submissions for this album, rendered on the album page. Its lifecycle:
//
//   window open        → intro + deadline strip + form card
//   window not started → countdown to the opening
//   closed, songs → 0  → "being produced" wait (submissions came in, no song yet)
//   first song exists  → nothing at all (its job is done)
//   never any activity → nothing at all
//
// Owns its own top divider so that hiding it also removes the divider — the album
// page just drops <Submissions/> in and lets it decide whether to show.
export default function Submissions({ albumId, artistName, status, songCount, refresh }: Props) {
  let body: React.ReactNode = null;
  if (songCount > 0) {
    // First song is published — the submission phase is over. Render nothing.
    body = null;
  } else if (status.open) {
    // Intro copy and the deadline strip sit *above* the form card, which is a
    // generic self-contained card (count header + fields). Keeping them out is
    // what lets the same card serve albums and mixtapes. An album is one song
    // per guest, hence oncePerDevice.
    body = (
      <div className="flex flex-col gap-md">
        <p className="text-sm text-secondary leading-relaxed">
          Help {artistName ?? 'this artist'} produce this album by submitting a
          song with your own custom lyrics.
        </p>
        {status.submission_deadline && (
          <DeadlineStrip deadline={status.submission_deadline} onExpire={refresh} />
        )}
        <SongWriter
          collectionId={albumId}
          trackCount={status.track_count}
          maxTracks={status.max_tracks}
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

// The countdown strip pinned above the form while a dated album is taking
// submissions: how long is left to get one in. A pulsing red so the room can't
// miss it. Albums with a deadline only — mixtapes have no window, so they never
// render this.
function DeadlineStrip({ deadline, onExpire }: { deadline: string; onExpire: () => void }) {
  return (
    <div className="deadline-strip">
      <span>Closing in:</span>
      <Countdown
        target={deadline}
        onExpire={onExpire}
        render={r => <span className="deadline-strip__time">{r}</span>}
      />
    </div>
  );
}

// The window is configured but hasn't opened yet. Show a countdown to the start;
// when it elapses, refresh so the form takes over.
function PendingNotice({ status, onStart }: { status: RequestStatus; onStart: () => void }) {
  return (
    <div className="flex flex-col items-center gap-sm text-center">
      <p className="text-sm text-secondary leading-relaxed">
        The song submissions for this album opens in…
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

// Submissions are in and closed, but no song has been generated yet — the album
// is being produced. Disappears entirely once the first song publishes.
function ProducingNotice() {
  return (
    <div className="flex flex-col items-center gap-md text-center py-sm">
      <div className="spinner large processing" />
      <p className="text-sm text-secondary leading-relaxed">
        The album is being produced — hang tight!
      </p>
    </div>
  );
}

// Live countdown to a target time, ticking each second. Once it elapses it calls
// onExpire (once) so the parent refetches and the stage advances.
function Countdown({
  target,
  onExpire,
  render,
}: {
  target: string;
  onExpire: () => void;
  render: (remaining: string) => React.ReactNode;
}) {
  const [remaining, setRemaining] = useState(() => Date.parse(target) - Date.now());

  useEffect(() => {
    const at = Date.parse(target);
    let fired = false;
    const tick = () => {
      const ms = at - Date.now();
      setRemaining(ms);
      if (ms <= 0 && !fired) {
        fired = true;
        onExpire();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target, onExpire]);

  if (remaining <= 0) return <span>Updating…</span>;
  return <span>{render(formatRemaining(remaining))}</span>;
}

function formatRemaining(ms: number): string {
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
