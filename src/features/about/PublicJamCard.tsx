import { Link } from 'react-router-dom';
import type { Collection } from '../../services/slopbop';
import { jamCapacity } from '../../hooks/collections';
import { Countdown } from '../../primitives/Countdown';
import Img from '../../primitives/Img';

interface Props {
  jam: Collection;
  /** Re-read the jam when its deadline passes, so a closed one stops inviting
   *  submissions without a page reload. */
  onExpire: () => void;
}

/**
 * The landing page's live jam: the artist profile's {@link LiveJamCard} blown
 * up to showcase scale — cover across the full column, the facts stacked
 * beneath it, the whole thing one tap through to the jam.
 *
 * It replaced a featured-artist card, and the trade is deliberate: an artist
 * card can only say "here is someone", where this says "here is something open
 * right now, go write on it". So it keeps the profile card's red live identity
 * rather than the accent — a visitor who meets the red here reads the same
 * colour on the artist's page as the same thing.
 *
 * The cover carries the jam's title and the artist's name as artwork, so the
 * body doesn't repeat either in text — what's left below the image is only what
 * the artwork can't say, because it changes: how full the tape is, how long is
 * left, and the artist's quoted pitch.
 */
export function PublicJamCard({ jam, onExpire }: Props) {
  const { count, max, full } = jamCapacity(jam);

  return (
    <Link to={`/jams/${jam._id}`} className="public-jam">
      <div className="relative">
        <Img
          src={jam.cover_url || '/Images/default_song_cover.png'}
          alt={jam.title || 'Untitled'}
          className="w-full aspect-square"
        />
        {/* The affordance, as a tab off the right edge, low enough to clear the
            cover's own lettering. A full tape has nothing left to try, so it
            states the phase instead of inviting. */}
        <span className="public-jam__tab">{full ? 'Tape full' : 'Try now! →'}</span>
      </div>

      <div className="public-jam__body">
        {max > 0 && (
          <>
            <div className="live-jam__gauge">
              <div
                className="live-jam__gauge-fill"
                style={{ width: `${Math.min(100, (count / max) * 100)}%` }}
              />
            </div>
            {/* Capacity and clock on one line — a jam closes on whichever
                lands first, so showing one without the other tells half of
                how much time is actually left. */}
            <div className="public-jam__meta">
              <span className="live-jam__count">{count} / {max} submissions in</span>
              {jam.submission_deadline && !full && (
                <span className="live-jam__count">
                  <Countdown
                    target={jam.submission_deadline}
                    onExpire={onExpire}
                    render={r => <>closes in {r}</>}
                  />
                </span>
              )}
            </div>
          </>
        )}

        <p className="live-jam__cta">
          {full
            ? '“The tape is full — the artist is picking the single”'
            : `“${jam.cta || 'Write my next Single'}”`}
        </p>
      </div>
    </Link>
  );
}
