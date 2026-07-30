import { apiFetch } from './client';

export interface SongStats {
  bops: number;
  slops: number;
  total_votes: number;
}

export interface Song {
  _id: string;
  artist_id: string;
  collection_id?: string;
  title?: string;
  duration?: number;
  cover_url?: string;
  // Media is withheld until release: an upcoming song (`released: false`) comes
  // through with `audio_url`, `animation_url`, and `lyrics` all null — only the
  // title and cover art are present, for the countdown card. Guard playback/
  // download against the missing audio.
  audio_url?: string;
  animation_url?: string;
  lyrics?: string;
  author?: string; // credited writer of the lyrics
  caption?: string;
  bpm?: number;
  keyscale?: string;
  lora?: string;
  // Whether the song has dropped. The backend is authoritative here — an
  // upcoming song is `released: false` with a future `release_date` and no
  // media; it flips to `true` (and media populates) at release, so re-fetch to
  // reveal rather than assuming the client already has the audio. See
  // `isReleased`.
  released?: boolean;
  // Real-world release moment as a UTC ISO-8601 "Z" timestamp ("YYYY-MM-DDTHH:MM:SSZ",
  // a Mongo BSON date). The countdown card ticks toward `new Date(release_date)`.
  // Also the catalogue sort key. No longer tied to sim time in any way.
  release_date?: string;
  created_at?: string;
  stats?: SongStats;
}

// Whether a song has dropped, per the backend's authoritative `released` flag.
// Upcoming songs arrive as `released: false` (future `release_date`, null media);
// legacy/immediately-published songs omit the flag, so absent counts as released.
// Not-yet-released songs are kept out of play queues and shown as countdown cards.
export function isReleased(song: Song): boolean {
  return song.released !== false;
}

export type VoteType = 'bop' | 'slop';

interface SongsResponse {
  success: boolean;
  songs: Song[];
}

interface SongResponse {
  success: boolean;
  song: Song;
}

interface VoteResponse {
  success: boolean;
  stats: SongStats;
}

export const fetchSongs = (artistId: string) =>
  apiFetch<SongsResponse>(`/slopbop/songs?artist_id=${artistId}`).then(r => r.songs);

// One song by id. The read for a song you know the id of but can't reach through
// a list — a resolved jam's winner, which has left the collection that named it.
export const fetchSong = (songId: string) =>
  apiFetch<SongResponse>(`/slopbop/songs/${songId}`).then(r => r.song);

export const voteSong = (songId: string, type: VoteType) =>
  apiFetch<VoteResponse>(`/slopbop/songs/${songId}/vote`, {
    method: 'PATCH',
    body: JSON.stringify({ type }),
  }).then(r => r.stats);
