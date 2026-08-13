import { Link } from 'react-router-dom';
import type { Collection, JamStatus } from '../../services/slopbop';
import { Countdown } from '../../primitives/Countdown';
import Img from '../../primitives/Img';

interface Props {
  jam: Collection;
  /** Where the jam has got to. Absent only if the server didn't send one — the
   *  card then reads as an open one, which is the state it looks like anyway. */
  jamStatus: JamStatus | null;
  /** Re-read the jam when a countdown passes, so a closed one stops inviting
   *  submissions without a page reload. */
  onExpire: () => void;
}

/**
 * The landing page's jam, and the only jam card there is: cover across the full
 * column, the facts stacked beneath it, the whole thing one tap through to the
 * jam.
 *
 * It replaced a featured-artist card, and the trade is deliberate: an artist
 * card can only say "here is someone", where this says "here is something
 * happening, go and be in it". The red frame is borrowed from the error token —
 * a live broadcast is always red.
 *
 * The cover carries the jam's title and the artist's name as artwork, so the
 * body doesn't repeat either in text — what's left below the image is only what
 * the artwork can't say, because it changes: how full the tape is, how long is
 * left, and where the jam has got to.
 *
 * The phase ladder below is the whole of what this card decides. It used to be
 * shared with a second card on the artist profile; that card is gone, so the
 * wording lives here, next to the markup it fills.
 */
export function PublicJamCard({ jam, jamStatus, onExpire }: Props) {
  const count = jam.submission_count ?? jam.song_count ?? 0;
  const max = jam.max_tracks ?? 0;
  const full = max > 0 && count >= max;
  const phase = jamStatus?.phase ?? 'open';

  // The tab off the cover's edge, the line under the facts, and whether the card
  // is a way in at all. Only a jam that can still take a song runs the artist's
  // own quoted pitch — it asks for one, which is the wrong thing to say once
  // none can be sent.
  const pitch = `“${jam.cta || 'Write my next Single'}”`;
  // A full tape is the same state as the tally, one day earlier: nothing left to
  // write, everything left to vote on. So the two say the same thing.
  const voting = phase === 'awaiting_resolution' || (phase === 'open' && full);
  // Over, either way: one song won, or nobody entered and none did.
  const over = phase === 'resolved' || phase === 'closed';

  let tab: string;
  let line: React.ReactNode = pitch;
  // A card with nowhere worth going doesn't pretend to be a door: a jam that
  // hasn't opened has no songs and no form yet, and one that ended empty has
  // nothing at all.
  let interactive = true;

  if (phase === 'scheduled') {
    tab = 'Starting soon';
    interactive = false;
  } else if (voting) {
    tab = 'Vote now →';
    line = 'Jam is full! Vote for your favorite song. Only the most bopped song will survive';
  } else if (over) {
    tab = phase === 'resolved' ? 'See the winner →' : 'Jam over';
    interactive = phase === 'resolved';
    line = (
      <>
        This jam is over.
        <br />
        Follow us to know when the next one drops
      </>
    );
  } else {
    tab = 'Try now! →';
  }

  // Both clocks are the same control pointed at different moments. Neither is
  // rendered once its moment has passed: `Countdown` on a past target sits on
  // "Updating…" forever, which is a broken-looking card on every finished jam.
  const clock =
    phase === 'scheduled' ? jamStatus?.submission_start ?? jam.submission_start ?? null
      : phase === 'open' && !full ? jam.submission_deadline ?? null
      : null;

  const body = (
    <>
      <div className="relative">
        <Img
          src={jam.cover_url || '/Images/default_song_cover.png'}
          alt={jam.title || 'Untitled'}
          className="w-full aspect-square"
        />
        {/* The affordance, as a tab off the right edge, low enough to clear the
            cover's own lettering. */}
        <span className="public-jam__tab">{tab}</span>
      </div>

      <div className="public-jam__body">
        {/* Gone once the jam is over: promotion empties the collection, so the
            bar would be measuring a tracklist that no longer exists. */}
        {!over && max > 0 && (
          <>
            <div className="public-jam__gauge">
              <div
                className="public-jam__gauge-fill"
                style={{ width: `${Math.min(100, (count / max) * 100)}%` }}
              />
            </div>
            {/* Capacity and clock on one line — a jam closes on whichever
                lands first, so showing one without the other tells half of
                how much time is actually left. */}
            <div className="public-jam__meta">
              <span className="public-jam__count">{count} / {max} submissions</span>
              {clock && (
                <span className="public-jam__count">
                  <Countdown
                    target={clock}
                    onExpire={onExpire}
                    render={r => <>{phase === 'scheduled' ? `opens in ${r}` : `closes in ${r}`}</>}
                  />
                </span>
              )}
            </div>
          </>
        )}

        {/* The label's own lines are centred; the artist's quote isn't, because
            it reads as someone speaking rather than as a notice. */}
        <p className={`public-jam__cta${over ? ' centered' : ''}`}>{line}</p>
      </div>
    </>
  );

  return interactive ? (
    <Link to={`/jams/${jam._id}`} className="public-jam">{body}</Link>
  ) : (
    <div className="public-jam public-jam--inert">{body}</div>
  );
}
