import type { VercelRequest, VercelResponse } from '@vercel/node';
import { API_URL, FALLBACK_IMAGE, fetchJson, serveEmbed } from './embed';

// Embeds for /albums/:id, /mixtapes/:id and /jams/:id — see `embed.ts` for why
// these are server-rendered at all.
//
// One handler for all three kinds because they're one backend resource: a
// `collections` doc discriminated by `type`. The copy is chosen from the type
// the backend returns, not from the route, so an embed can't disagree with the
// page it links to. It says nothing about which stage the collection is in —
// a link's unfurl shouldn't change under a reader while the clock runs.

// Mirror of the fields this needs from `services/slopbop/collections.ts` —
// snake_case, straight off the wire, since nothing here goes through the app's
// client.
type CollectionType = 'album' | 'mixtape' | 'jam';

interface Collection {
  type?: CollectionType;
  title?: string;
  artist_id: string;
  cover_url?: string;
}

const PATH_SEGMENT: Record<CollectionType, string> = {
  album: 'albums',
  mixtape: 'mixtapes',
  jam: 'jams',
};

// Used in the fallback title ("Untitled jam") and the image alt.
const KIND_LABEL: Record<CollectionType, string> = {
  album: 'album',
  mixtape: 'mixtape',
  jam: 'jam',
};

// The one line under the cover in the unfurl — one per kind, saying who wrote
// the songs and who made them, which is the whole difference between the three.
const DESCRIBE: Record<CollectionType, (title: string, artist: string) => string> = {
  album: (title, artist) => `Listen to ${artist}'s album ${title} on SlopBop!`,
  mixtape: (title, artist) =>
    `${title}: songs written by a group, recorded by ${artist}. Listen on SlopBop!`,
  jam: (title, artist) =>
    `${title}: you write the lyrics, ${artist} makes the song. Listen on SlopBop!`,
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  return serveEmbed(req, res, async (id, host) => {
    const { collection } = await fetchJson<{ collection: Collection }>(
      `${API_URL}/slopbop/collections/${id}`,
    );
    const { artist } = await fetchJson<{ artist: { name?: string } }>(
      `${API_URL}/slopbop/artists/${collection.artist_id}`,
    );

    const type: CollectionType = collection.type ?? 'album';
    const kind = KIND_LABEL[type];
    const title = collection.title || `Untitled ${kind}`;
    const artistName = artist.name || 'Unknown Artist';

    return {
      title: `${title} by ${artistName}`,
      description: DESCRIBE[type](title, artistName),
      image: collection.cover_url || FALLBACK_IMAGE,
      imageAlt: `${title} — ${kind} cover`,
      url: `https://${host}/${PATH_SEGMENT[type]}/${id}`,
      // Covers are square (1024×1024), not the site banner's 1200×630.
      width: 1024,
      height: 1024,
    };
  });
}
