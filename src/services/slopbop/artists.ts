import { apiFetch } from './client';

export interface Artist {
  artist_id: string;
  name: string;
  bio?: string;
  image_url?: string;
  socials?: Record<string, string>;
  gender?: string;
  nationality?: string;
  genres?: string[];
  zodiac_sign?: string;
  /** The wallet that owns this artist. Absent on unclaimed artists. */
  owner_wallet?: string;
}

interface ArtistResponse {
  success: boolean;
  artist: Artist;
  /**
   * Whether the bearer token on the request owns this artist. The route takes
   * the token as optional and never rejects — anonymous, expired, and malformed
   * tokens all get a 200 with `false` — so this is a rendering hint only, never
   * a permission. Forging it just draws buttons.
   */
  is_owner: boolean;
}

interface ArtistsResponse {
  success: boolean;
  artists: Record<string, Artist>;
}

export const fetchArtist = (id: string) =>
  apiFetch<ArtistResponse>(`/slopbop/artists/${id}`)
    .then(r => ({ artist: r.artist, isOwner: r.is_owner }));

export const fetchArtists = (limit?: number) => {
  const params = limit ? `?limit=${limit}` : '';
  return apiFetch<ArtistsResponse>(`/slopbop/artists${params}`).then(r => r.artists);
};
