import { Link } from 'react-router-dom';
import { BottomSheet } from '../../primitives/BottomSheet';
import { Artist, Location } from '../../services/slopbop';

// One artist at a location: a compact clickable strip — icon on the left,
// name beside it — that opens their profile page.
function ArtistStrip({ artist }: { artist: Artist }) {
  return (
    <Link
      to={`/artists/${artist._id}`}
      className="flex items-center gap-md rounded-xl bg-surface-2 border border-border p-sm active:opacity-70 transition-opacity"
    >
      <img
        src={artist.imageUrl ?? '/Images/mystery-actor.png'}
        alt={artist.name}
        className="w-10 h-10 rounded-full object-cover object-top shrink-0"
      />
      <span className="font-display text-md truncate">{artist.name}</span>
    </Link>
  );
}

// Sliding panel for a tapped location: name, description, and the artists
// currently standing on its tile. `location` stays set while the sheet
// animates closed, so its content doesn't blank out mid-slide.
export function LocationPanel({
  open,
  onClose,
  location,
  occupants,
}: {
  open: boolean;
  onClose: () => void;
  location: Location | null;
  occupants: Artist[];
}) {
  return (
    <BottomSheet open={open} onClose={onClose} fitContent>
      {location && (
        <div className="flex flex-col gap-lg">
          <h2 className="font-display text-xl text-center uppercase tracking-wide">
            {location.name}
          </h2>
          <p className="text-sm text-gray leading-relaxed">
            {location.description}
          </p>
          {occupants.length > 0 ? (
            <div className="flex flex-col gap-sm">
              {occupants.map(a => (
                <ArtistStrip key={a._id} artist={a} />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray text-sm">
              Nobody here right now.
            </p>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
