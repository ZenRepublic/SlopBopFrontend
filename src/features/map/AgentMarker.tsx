import { Link } from 'react-router-dom';
import { Artist } from '../../services/slopbop';
import { tileToPixel, WorldBounds } from './grid';

// An agent pinned on the board at their current tile. Tapping opens the
// artist profile. `transition-[left,top]` glides the avatar when the tile
// changes between snapshots — agents always sit on integer tiles, so this
// needs no travel maths at all.
export function AgentMarker({
  artist,
  tile,
  bounds,
}: {
  artist: Artist;
  tile: [number, number];
  bounds: WorldBounds;
}) {
  const { left, top } = tileToPixel(tile, bounds);

  return (
    <Link
      to={`/artists/${artist._id}`}
      style={{ left, top }}
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 transition-[left,top] duration-700 ease-in-out active:opacity-70"
    >
      <img
        src={artist.imageUrl ?? '/Images/mystery-actor.png'}
        alt={artist.name}
        className="w-11 h-11 rounded-full object-cover object-top border-2 border-white shadow-md"
      />
      <span className="px-1 rounded bg-black/70 text-xs leading-tight">
        {artist.name}
      </span>
    </Link>
  );
}
