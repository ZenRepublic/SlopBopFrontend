import { useNavigate } from 'react-router-dom';
import type { Collection } from '../../services/slopbop';
import { mixtapeCapacity } from '../../hooks/useLiveMixtape';
import Img from '../../primitives/Img';

interface Props {
  mixtape: Collection;
}

// The interrupt on the artist profile: this artist is running a mixtape right
// now, and one of its songs becomes their next single. Sits directly under the
// bio and genre tags, where the page would otherwise settle into the catalogue.
//
// It's deliberately not a Discography entry — a mixtape is a session, not a
// release. When the artist picks the winner the collection is deleted, this
// card vanishes with it, and the surviving song appears under Singles.
//
// The copy speaks in the artist's own voice — it's them asking for help, not the
// label describing them. That only works because this card lives on their own
// profile and nowhere else; "my" would lose its referent anywhere general.
export default function LiveMixtapeCard({ mixtape }: Props) {
  const navigate = useNavigate();
  const { count, max, full } = mixtapeCapacity(mixtape);

  return (
    <button
      type="button"
      onClick={() => navigate(`/mixtapes/${mixtape._id}`)}
      className="live-mixtape"
    >
      <div className="live-mixtape__cover">
        <Img
          src={mixtape.cover_url || '/Images/default_song_cover.png'}
          alt={mixtape.title || 'Untitled'}
          className="w-full aspect-square"
        />
      </div>

      <div className="live-mixtape__body flex-1">
        <p className="font-display text-base truncate">{mixtape.title || 'Untitled'}</p>

        {max > 0 && (
          <>
            <div className="live-mixtape__gauge">
              <div
                className="live-mixtape__gauge-fill"
                style={{ width: `${Math.min(100, (count / max) * 100)}%` }}
              />
            </div>
            {/* Submissions, not tracks — every entry is a submission; only one
                survives as a track. */}
            <p className="live-mixtape__count">{count} / {max} submissions in</p>
          </>
        )}

        {/* The artist's line, quoted, under the facts rather than above them.
            A full tape overrides it: their pitch asks for songs, which is the
            wrong thing to say once nothing more can be submitted. */}
        <p className="live-mixtape__cta">
          {full
            ? '“The tape is full — I’m picking the single”'
            : `“${mixtape.cta || 'Write my next Single'}”`}
        </p>
      </div>
    </button>
  );
}
