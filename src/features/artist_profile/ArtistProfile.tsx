import { useParams, useNavigate } from 'react-router-dom';
import { useArtist } from '../../hooks/useArtist';
import { useLiveJam } from '../../hooks/useLiveJam';
import ExpandableBio from './ExpandableBio';
import TagPills from '../../primitives/TagPills';
import Img from '../../primitives/Img';
import Discography from './Discography';
import LiveJamCard from './LiveJamCard';

export default function ArtistProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const artistId = id ?? '';
  // `isOwner` comes from this page's own fetch, not from comparing the connected
  // key to `owner_wallet` — the server is the one that decides, and it answers
  // this URL differently depending on the token it was handed.
  const { artist, isOwner, loading } = useArtist(artistId);
  // An open jam makes the artist "live" — see useLiveJam. It loads
  // alongside the artist rather than gating the page: the profile is worth
  // showing immediately, and the badge and card just appear when it resolves.
  const { jam } = useLiveJam(artistId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner large processing" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted">Artist not found</p>
      </div>
    );
  }

  const heroSrc = artist.image_url || '/Images/mystery-actor.png';

  return (
    <div className="flex flex-col relative">
      {/* Hero image — full width of the 430px container */}
      <div className="artist-hero">
        <Img
          src={heroSrc}
          alt={artist.name}
          className="w-full h-full"
          imgClassName="object-cover object-[center_50%]"
        />
        {/* Back button overlaid on top-left of hero */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-lg left-lg z-10 flex items-center justify-center w-12 h-12 rounded-full bg-black/70 text-white active:opacity-70 transition-opacity"
          aria-label="Go back"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>
      </div>

      {/* Artist info — overlaps the hero image */}
      <div className="artist-hero-content flex flex-col gap-md p-lg">
        {/* Owner's view of the same public page. There are no owner-only actions
            on the backend yet, so this says who you are and stops there rather
            than drawing buttons with nothing to call. */}
        {isOwner && (
          <span className="owner-badge">Signed in as this artist</span>
        )}

        {jam && (
          <span className="live-badge">
            <span className="live-badge__dot" />
            Live
          </span>
        )}

        <h1 className="font-display text-xl text-left drop-shadow-lg">{artist.name}</h1>

        {artist.bio && (
          <div className="frosted-card p-lg flex flex-col gap-md">
            <ExpandableBio text={artist.bio} />
          </div>
        )}

        <TagPills tags={artist.genres} />

        {/* Pushed well off the genre pills — sitting one gap below them it read
            as a continuation of the bio block. No section header: the card is
            loud enough to announce itself, and titling it only added clutter. */}
        {jam && (
          <div className="mt-lg">
            <LiveJamCard jam={jam} />
          </div>
        )}
      </div>

      {/* Discography */}
      <div className="p-lg">
        <Discography artistId={artistId} artistName={artist.name} />
      </div>
    </div>
  );
}
