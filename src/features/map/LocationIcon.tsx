import { Location } from '../../services/slopbop';
import { tileToPixel, WorldBounds } from './grid';

// A location pinned on the world board: an icon with its name underneath —
// the Shadows-Over-Loathing look. When you have per-location art, swap the
// emoji bubble for an <img>; placement stays the same.
export function LocationIcon({
  location,
  bounds,
}: {
  location: Location;
  bounds: WorldBounds;
}) {
  const { left, top } = tileToPixel(location.position, bounds);

  return (
    <div
      style={{ left, top }}
      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
    >
      <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-border flex items-center justify-center text-3xl shadow-lg">
        {location.emoji}
      </div>
      <span className="mt-1 px-1.5 rounded bg-black/70 text-xs leading-tight text-center max-w-[6rem]">
        {location.name}
      </span>
    </div>
  );
}
