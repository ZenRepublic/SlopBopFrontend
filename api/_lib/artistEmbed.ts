import type { VercelRequest, VercelResponse } from '@vercel/node';
import { API_URL, clip, fetchJson, serveEmbed } from './embed';

// Embed for /artists/:id — see `embed.ts` for why this is server-rendered.
//
// An artist page is the one link a *person* gets shared as, so the unfurl leads
// with the portrait and the artist's own bio. The bio is the best description
// this site has — genuinely unique per artist, which is the whole point for
// search — so it's used verbatim (clipped), with a generated line as the floor
// for artists who haven't written one yet.

// Mirror of the fields this needs from `services/slopbop/artists.ts`.
interface Artist {
  name?: string;
  bio?: string;
  image_url?: string;
  genres?: string[];
}

// The portrait is generated at the same square size as collection covers.
const PORTRAIT_SIZE = 1024;
// Artists without a portrait render `/Images/mystery-actor.png` in the app, so
// the embed shows the same face rather than the site banner.
const MYSTERY_PORTRAIT = 'https://slopbop.com/Images/mystery-actor.png';

function describe(artist: Artist, name: string): string {
  if (artist.bio?.trim()) return clip(artist.bio);
  const genres = artist.genres?.length ? artist.genres.join(', ') : 'synthetic';
  return `${name} is a ${genres} artist on SlopBop. Listen to their songs, or write one for them.`;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  return serveEmbed(req, res, async (id, host) => {
    const { artist } = await fetchJson<{ artist: Artist }>(
      `${API_URL}/slopbop/artists/${id}`,
    );

    const name = artist.name || 'Unknown Artist';

    return {
      title: name,
      description: describe(artist, name),
      image: artist.image_url || MYSTERY_PORTRAIT,
      imageAlt: `${name} — artist portrait`,
      url: `https://${host}/artists/${id}`,
      width: PORTRAIT_SIZE,
      height: PORTRAIT_SIZE,
    };
  });
}
