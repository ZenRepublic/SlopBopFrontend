const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`${endpoint}: ${response.statusText}`);
  }

  return response.json();
}

// ── Types ──────────────────────────────────────────────

export interface Artist {
  _id: string;
  nickname: string;
  bio?: string;
  imageUrl?: string;
  socials?: Record<string, string>;
}

export type CollectionType = 'Album' | 'EP';

export interface Collection {
  _id: string;
  artistId: string;
  collectionType: CollectionType;
  title?: string;
  coverUrl?: string;
  isRecording?: boolean;
  createdAt?: string;
}

export interface SongStats {
  bops: number;
  slops: number;
  totalVotes: number;
}

export interface Song {
  _id: string;
  artistId: string;
  collectionId?: string;
  title?: string;
  duration?: number;
  coverUrl?: string;
  audioUrl?: string;
  animationUrl?: string;
  lyrics?: string;
  createdAt?: string;
  stats?: SongStats;
}

// ── Response wrappers (match backend) ──────────────────

interface ArtistResponse {
  success: boolean;
  artist: Artist;
}

interface CollectionsResponse {
  success: boolean;
  collections: Collection[];
}

interface CollectionResponse {
  success: boolean;
  collection: Collection;
  songs: Song[];
}

interface SongsResponse {
  success: boolean;
  songs: Song[];
}

// ── Endpoint functions ─────────────────────────────────

export const fetchArtist = (id: string) =>
  apiFetch<ArtistResponse>(`/msi/artist/${id}`).then(r => r.artist);

export const fetchCollections = (artistId: string, type?: CollectionType) => {
  const params = new URLSearchParams({ artist_id: artistId });
  if (type) params.set('type', type);
  return apiFetch<CollectionsResponse>(`/msi/collections?${params}`).then(r => r.collections);
};

export const fetchCollection = (id: string) =>
  apiFetch<CollectionResponse>(`/msi/collections/${id}`).then(r => ({ collection: r.collection, songs: r.songs }));

export const fetchSongs = (artistId: string) =>
  apiFetch<SongsResponse>(`/msi/songs?artist_id=${artistId}`).then(r => r.songs);

// ── Voting ───────────────────────────────────────────────

export type VoteType = 'bop' | 'slop';

interface VoteResponse {
  success: boolean;
  stats: SongStats;
}

export const voteSong = (songId: string, type: VoteType) =>
  apiFetch<VoteResponse>(`/msi/songs/${songId}/vote`, {
    method: 'PATCH',
    body: JSON.stringify({ type }),
  }).then(r => r.stats);

// ── Recording Mode ──────────────────────────────────────

interface RecordingModePayload {
  collectionId: string;
  isRecording: boolean;
  walletAddress: string;
  challengeId: string;
  message: string;
  signature: string;
}

interface RecordingModeResponse {
  success: boolean;
}

export const setRecordingMode = (payload: RecordingModePayload) =>
  apiFetch<RecordingModeResponse>('/msi/collections/recording-mode', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// ── Admin ───────────────────────────────────────────────

interface AdminCheckResponse {
  isAdmin: boolean;
}

export const checkAdmin = (walletAddress: string) =>
  apiFetch<AdminCheckResponse>(`/msi/admin/check`, {
    method: 'POST',
    body: JSON.stringify({ walletAddress }),
  }).then(r => r.isAdmin);