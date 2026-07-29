import type { VercelRequest, VercelResponse } from '@vercel/node';

// ── Per-album social embeds (Open Graph / Twitter cards) ───────────────────
// Why this exists as a server function and not React:
//
// The app is a client-rendered SPA. Social crawlers (Discord, iMessage,
// Twitter/X, Slack, Facebook, WhatsApp…) fetch the raw HTML and DO NOT run our
// JavaScript, so anything React sets at runtime is invisible to them — every
// album would unfurl with the generic site banner from index.html.
//
// vercel.json rewrites /albums/:id here first. This function serves the SAME
// app shell (index.html) to everyone — React still boots and renders the page
// normally for real users — but with the <meta> tags rewritten to this album's
// cover, title, and artist so the link embed is correct.
//
// Fetches the backend the same way the app does (VITE_API_URL is a Vercel env
// var, available here via process.env). On any failure it serves the shell
// untouched, so a backend hiccup degrades to the default site embed, never a
// broken page.

const API_URL = (process.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
const FALLBACK_IMAGE = 'https://slopbop.com/Branding/og-banner.png';

// The backend has no album resource: an album is a `collections` doc with type
// 'album', read through the generic collection endpoint like every other kind.
// Only the public URL is album-specific.
interface Collection {
  title?: string;
  artist_id: string;
  cover_url?: string;
}

// HTML-attribute escaping — album/artist titles are user-derived and land
// inside content="…", so every quote/angle-bracket/ampersand must be neutered.
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Replace the content of an existing <meta ... content="..."> by its
// property="…"/name="…" selector. index.html authors these as `<selector>
// content="…"`, which this matches. Unknown tags are left as-is.
function setMeta(html: string, selector: string, value: string): string {
  const re = new RegExp(`(<meta\\s+${selector}\\s+content=")[^"]*(")`, 'i');
  return html.replace(re, `$1${esc(value)}$2`);
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json() as Promise<T>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const host = req.headers.host ?? 'slopbop.com';

  // Grab the built app shell so React still boots for real users. index.html is
  // a real static file, served before rewrites, so this doesn't recurse.
  const shell = await fetch(`https://${host}/index.html`).then(r => r.text());

  let html = shell;
  try {
    const { collection } = await fetchJson<{ collection: Collection }>(
      `${API_URL}/slopbop/collections/${id}`,
    );
    const { artist } = await fetchJson<{ artist: { name?: string } }>(
      `${API_URL}/slopbop/artists/${collection.artist_id}`,
    );

    const title = collection.title || 'Untitled Album';
    const artistName = artist.name || 'Unknown Artist';
    const image = collection.cover_url || FALLBACK_IMAGE;
    const ogTitle = `${title} by ${artistName}`;
    const description = `Listen to ${artistName}'s album ${title} on SlopBop!`;
    const url = `https://${host}/albums/${id}`;

    html = setMeta(html, 'property="og:title"', ogTitle);
    html = setMeta(html, 'property="og:description"', description);
    html = setMeta(html, 'property="og:url"', url);
    html = setMeta(html, 'property="og:image"', image);
    html = setMeta(html, 'property="og:image:alt"', `${title} — album cover`);
    // Album covers are square (1024×1024), not the site banner's 1200×630.
    html = setMeta(html, 'property="og:image:width"', '1024');
    html = setMeta(html, 'property="og:image:height"', '1024');
    html = setMeta(html, 'name="twitter:title"', ogTitle);
    html = setMeta(html, 'name="twitter:description"', description);
    html = setMeta(html, 'name="twitter:image"', image);
    html = setMeta(html, 'name="twitter:image:alt"', `${title} — album cover`);
    html = html.replace(
      /(<link\s+rel="canonical"\s+href=")[^"]*(")/i,
      `$1${esc(url)}$2`,
    );
  } catch {
    // Backend unreachable or album missing → serve the shell with the default
    // site embed. The SPA still renders (and shows its own "not found" state).
  }

  // Cache the rendered shell at the CDN so repeat crawls/loads skip the backend
  // round-trip, while staying fresh within a few minutes.
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');
  res.status(200).send(html);
}
