import { useNavigate } from 'react-router-dom';
import type { Collection } from '../../services/slopbop';
import { jamCapacity } from '../../hooks/useLiveJam';
import Img from '../../primitives/Img';

interface Props {
  jam: Collection;
}

// The interrupt on the artist profile: this artist is running a jam right
// now, and one of its songs becomes their next single. Sits directly under the
// bio and genre tags, where the page would otherwise settle into the catalogue.
//
// It's deliberately not a Discography entry — a jam is a session, not a
// release. When the artist picks the winner the collection is deleted, this
// card vanishes with it, and the surviving song appears under Singles.
//
// The copy speaks in the artist's own voice — it's them asking for help, not the
// label describing them. That only works because this card lives on their own
// profile and nowhere else; "my" would lose its referent anywhere general.
export default function LiveJamCard({ jam }: Props) {
  const navigate = useNavigate();
  const { count, max, full } = jamCapacity(jam);

  return (
    <button
      type="button"
      onClick={() => navigate(`/jams/${jam._id}`)}
      className="live-jam"
    >
      <div className="live-jam__cover">
        <Img
          src={jam.cover_url || '/Images/default_song_cover.png'}
          alt={jam.title || 'Untitled'}
          className="w-full aspect-square"
        />
      </div>

      <div className="live-jam__body flex-1">
        <p className="font-display text-base truncate">{jam.title || 'Untitled'}</p>

        {max > 0 && (
          <>
            <div className="live-jam__gauge">
              <div
                className="live-jam__gauge-fill"
                style={{ width: `${Math.min(100, (count / max) * 100)}%` }}
              />
            </div>
            {/* Submissions, not tracks — every entry is a submission; only one
                survives as a track. */}
            <p className="live-jam__count">{count} / {max} submissions in</p>
          </>
        )}

        {/* The artist's line, quoted, under the facts rather than above them.
            A full tape overrides it: their pitch asks for songs, which is the
            wrong thing to say once nothing more can be submitted. */}
        <p className="live-jam__cta">
          {full
            ? '“The tape is full — I’m picking the single”'
            : `“${jam.cta || 'Write my next Single'}”`}
        </p>
      </div>
    </button>
  );
}
