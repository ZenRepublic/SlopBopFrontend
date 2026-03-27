import { useArtists } from './hooks/useArtists';
import { ArtistCard } from './features/artist_profile/ArtistCard';

function App() {
  const { artists, loading } = useArtists();

  return (
    <div className="flex flex-col gap-xl px-md py-lg">

      <div className="flex flex-col gap-sm">
        <h1 className="font-display text-2xl">Slop Bop</h1>
        <p className="text-sm leading-relaxed">
          AI-generated synthetic artists. Browse their music, rate their tracks, and request songs during their live album recordings.
        </p>
      </div>

      <div className="flex flex-col gap-md">
        <h2 className="font-display text-lg">Artists</h2>

        {loading && (
          <p className="text-secondary text-sm">Loading...</p>
        )}

        {!loading && artists.length === 0 && (
          <p className="text-secondary text-sm">No artists yet.</p>
        )}

        {!loading && artists.length > 0 && (
          <div className="flex flex-col gap-md">
            {artists.map(artist => (
              <ArtistCard key={artist._id} artist={artist} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default App;
