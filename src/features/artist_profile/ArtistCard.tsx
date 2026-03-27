import { Link } from 'react-router-dom';
import { Artist } from '../../services/api';

export function ArtistCard({ artist }: { artist: Artist }) {
  return (
    <Link
      to={`/artists/${artist._id}`}
      className="flex flex-col rounded-xl overflow-hidden bg-surface border border-border active:opacity-70 transition-opacity w-full"
    >
      <div className="w-full aspect-video bg-surface-2 overflow-hidden">
        <img
          src={artist.imageUrl ?? '/Images/mystery-actor.png'}
          alt={artist.nickname}
          className="w-full h-full object-cover object-top"
        />
      </div>
      <div className="px-md py-sm">
        <p className="font-display text-xl truncate text-center">{artist.nickname}</p>
      </div>
    </Link>
  );
}
