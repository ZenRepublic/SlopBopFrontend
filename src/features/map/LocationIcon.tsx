import { Location } from '../../services/slopbop';
import { tileToPixel, WorldBounds } from './grid';

// A location pinned on the world board: an icon with its name underneath —
// the Shadows-Over-Loathing look. When occupied, a small overlay sits above
// the icon (mirroring the name label below). Tapping opens its panel.
export function LocationIcon({
  location,
  bounds,
  occupantCount,
  onClick,
}: {
  location: Location;
  bounds: WorldBounds;
  occupantCount: number;
  onClick: () => void;
}) {
  const { left, top } = tileToPixel(location.position, bounds);

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ left, top }}
      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center active:opacity-70"
    >
      {/* Top overlay: someone is standing here. The slot is always reserved
          (invisible when empty) so the icon doesn't shift between states. */}
      <span className={`mb-1 ${occupantCount > 0 ? '' : 'invisible'}`}>
        <span className="rounded bg-black/70 px-1.5 py-0.5 text-xs leading-none">
          👤 {occupantCount}
        </span>
      </span>

      <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-border flex items-center justify-center text-3xl shadow-lg">
        {location.emoji}
      </div>

      <span className="mt-1 px-1.5 rounded bg-black/70 text-xs leading-tight text-center max-w-[6rem]">
        {location.name}
      </span>
    </button>
  );
}
