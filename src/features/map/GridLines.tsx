import { TILE_SIZE, MARGIN_TILES, GRIDLINE_OPACITY } from './grid';

// A non-interactive development overlay. Two layers, both governed by
// GRIDLINE_OPACITY (0 hides everything):
//   1. a dark fill over the MARGIN_TILES border ring, so the content area
//      is easy to pick out from the breathing-room margin;
//   2. the tile grid across the whole board. The board's top-left is itself
//      a tile corner, so the lines need no offset to match tileToPixel().
export function GridLines() {
  if (GRIDLINE_OPACITY <= 0) return null;

  const marginPx = MARGIN_TILES * TILE_SIZE;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: GRIDLINE_OPACITY }}
    >
      {/* Dark fill over the margin ring — a thick border frames the content. */}
      {marginPx > 0 && (
        <div
          className="absolute inset-0 box-border"
          style={{ border: `${marginPx}px solid #000` }}
        />
      )}

      {/* Tile grid over the whole board. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fff 1px, transparent 1px), ' +
            'linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: `${TILE_SIZE}px ${TILE_SIZE}px`,
        }}
      />
    </div>
  );
}
