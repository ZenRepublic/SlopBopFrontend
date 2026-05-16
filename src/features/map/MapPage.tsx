import { useState, useEffect } from 'react';
import { useWorldMap } from '../../hooks/useWorldMap';
import { useArtists } from '../../hooks/useArtists';
import { useSim } from '../../context/SimContext';
import { computeBounds } from './grid';
import { GridLines } from './GridLines';
import { LocationIcon } from './LocationIcon';
import { AgentMarker } from './AgentMarker';

// Tracks the viewport size so the board can be scaled to fit it.
function useViewportSize() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

// Full-screen world map (route: /map). Unlike the rest of the app it is NOT
// clamped to the 430px column — it fills the whole viewport. The board is
// sized to its tiles (computeBounds) and then scaled so the entire world is
// always visible at once, filling the screen with no scrolling.
//
// z-10 keeps it under the header (z-1000), which stays overlaid for the
// clock and navigation.
export default function MapPage() {
  const { map: locations, loading: mapLoading } = useWorldMap();
  const { artists, loading: artistsLoading } = useArtists();
  const { sim } = useSim();
  const { w: vw, h: vh } = useViewportSize();

  const loading = mapLoading || artistsLoading;

  // The board is sized from the *locations* only, so it stays stable as
  // agents move around inside it. MARGIN_TILES gives agents room to roam
  // a little past the outermost location without leaving the board.
  const bounds = computeBounds((locations ?? []).map(l => l.position));

  // Contain-fit: scale so the whole board fits, filling whichever axis is
  // tighter. Allowed to scale above 1 so a small world still fills the view.
  const scale = Math.min(vw / bounds.width, vh / bounds.height);

  // [artist, tile] for every placed agent. Agents always sit on an integer
  // tile, so each renders directly with no travel interpolation.
  const artistById = new Map(artists.map(a => [a._id, a]));
  const agents = sim
    ? Object.entries(sim.artists).flatMap(([id, snap]) => {
        const artist = artistById.get(id);
        if (!artist || !snap?.position) return [];
        return [{ artist, tile: snap.position }];
      })
    : [];

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-hidden bg-surface">
      {loading ? (
        <p className="text-secondary text-sm">Loading world...</p>
      ) : (
        <div
          className="relative shrink-0 bg-cover bg-center"
          style={{
            width: bounds.width,
            height: bounds.height,
            transform: `scale(${scale})`,
            backgroundImage: "url('/Images/world-map.png')",
          }}
        >
          <GridLines />
          {locations?.map(loc => (
            <LocationIcon key={loc._id} location={loc} bounds={bounds} />
          ))}
          {agents.map(({ artist, tile }) => (
            <AgentMarker key={artist._id} artist={artist} tile={tile} bounds={bounds} />
          ))}
        </div>
      )}
    </div>
  );
}
