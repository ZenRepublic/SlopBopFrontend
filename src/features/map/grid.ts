// --- Map authoring knobs -----------------------------------------------
// The backend gives every location and agent an integer tile coordinate. It
// uses those only for distance / travel-turn maths — it doesn't care how the
// map looks. The map's job is to paint those tiles onto a board.
//
// The board is NOT a hand-picked pixel size: it's derived from the tiles it
// has to contain (see computeBounds), so there's never empty grid above or
// left of the content. Only two knobs are tuned by hand:
//
//   TILE_SIZE    - how many board pixels one logic tile spans
//   MARGIN_TILES - empty tiles of breathing room kept around the content
//
// The board is then scaled to fit the viewport, so TILE_SIZE is just an
// internal resolution — bigger = crisper background art, nothing more.

export const TILE_SIZE = 100;
export const MARGIN_TILES = 1;

// Development aid: draws the tile grid over the board so you can check that
// icons line up with the background art. 0.0 = hidden, 1.0 = fully opaque.
// Set to 0 once the art lines up.
export const GRIDLINE_OPACITY = 0.3;

export interface PixelPos {
  left: number;
  top: number;
}

// The board's extent, derived from the tiles it must contain. `minX/minY` is
// the top-left tile (margin included); `width/height` is the board in pixels.
export interface WorldBounds {
  minX: number;
  minY: number;
  cols: number;
  rows: number;
  width: number;
  height: number;
}

// Build the board from the tiles it has to show. It starts MARGIN_TILES
// before the top-left-most tile and ends MARGIN_TILES past the bottom-right,
// so the content always sits inside with an even border — no dead zone.
export function computeBounds(tiles: [number, number][]): WorldBounds {
  if (tiles.length === 0) {
    return { minX: 0, minY: 0, cols: 1, rows: 1, width: TILE_SIZE, height: TILE_SIZE };
  }
  const xs = tiles.map(t => t[0]);
  const ys = tiles.map(t => t[1]);
  const minX = Math.min(...xs) - MARGIN_TILES;
  const minY = Math.min(...ys) - MARGIN_TILES;
  const cols = Math.max(...xs) + MARGIN_TILES - minX + 1;
  const rows = Math.max(...ys) + MARGIN_TILES - minY + 1;
  return {
    minX,
    minY,
    cols,
    rows,
    width: cols * TILE_SIZE,
    height: rows * TILE_SIZE,
  };
}

// Logic tile -> pixel position on the board. Returns the *centre* of the
// cell (the +0.5 offset), measured from the board's top-left corner. Each
// marker centres its own icon over this point with a CSS transform.
export function tileToPixel(
  [tx, ty]: [number, number],
  bounds: WorldBounds,
): PixelPos {
  return {
    left: (tx - bounds.minX + 0.5) * TILE_SIZE,
    top: (ty - bounds.minY + 0.5) * TILE_SIZE,
  };
}
