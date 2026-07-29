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
}

interface ArtistResponse {
  success: boolean;
  artist: Artist;
}

interface ArtistsResponse {
  success: boolean;
  artists: Record<string, Artist>;
}

export const fetchArtist = (id: string) =>
  apiFetch<ArtistResponse>(`/slopbop/artists/${id}`).then(r => r.artist);

export const fetchArtists = (limit?: number) => {
  const params = limit ? `?limit=${limit}` : '';
  return apiFetch<ArtistsResponse>(`/slopbop/artists${params}`).then(r => r.artists);
};
