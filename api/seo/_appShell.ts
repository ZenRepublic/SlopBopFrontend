import type { VercelRequest, VercelResponse } from '@vercel/node';

// ── Social embeds (Open Graph / Twitter cards) for SPA routes ──────────────
// Why these exist as server functions and not React:
//
// The app is a client-rendered SPA. Social crawlers (Discord, iMessage,
// Twitter/X, Slack, Facebook, WhatsApp…) fetch the raw HTML and DO NOT run our
// JavaScript, so anything React sets at runtime is invisible to them — every
// artist, album, mixtape and jam would unfurl with the generic site banner from
// index.html. Jam and mixtape links are the ones actually pasted into a group
// chat, so this matters most for them.
//
// vercel.json rewrites the shareable routes to a function that calls
// `serveEmbed` below. It serves the SAME app shell (index.html) to everyone —
// React still boots and renders the page normally for real users — but with the
// <meta> tags rewritten for the thing being linked.
//
// This module is the plumbing; each handler owns only its fetch and its copy.

export const API_URL = (process.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
export const FALLBACK_IMAGE = 'https://www.slopbop.com/Branding/og-banner.png';

/** What one route wants the crawler to see. */
export interface Embed {
  /** og:title / twitter:title. `<title>` gets " — SlopBop" appended. */
  title: string;
  /** The one line under the image. Also the plain meta description. */
  description: string;
  image: string;
  imageAlt: string;
  /** Absolute canonical URL — derived from what the backend returned, not the
   *  route that was hit, so a link on a wrong path still points crawlers right. */
  url: string;
  /** Pixel dimensions of `image`. index.html declares the banner's 1200×630,
   *  which crops badly when the real image isn't that shape. */
  width: number;
  height: number;
}

export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json() as Promise<T>;
}

// HTML-attribute escaping — titles, names and bios are user-derived and land
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

/**
 * Collapse and clip user-authored prose (a bio) down to something a search
 * result can show, cutting on a word boundary rather than mid-word.
 */
export function clip(text: string, max = 180): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\-—]+$/, '')}…`;
}

/**
 * Serve the app shell with `build`'s meta tags patched in.
 *
 * `build` returning null (or throwing — a missing record, an unreachable
 * backend) serves the shell untouched, so a hiccup degrades to the default site
 * embed, never a broken page. The SPA still renders its own "not found" state.
 */
export async function serveEmbed(
  req: VercelRequest,
  res: VercelResponse,
  build: (id: string, host: string) => Promise<Embed | null>,
) {
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const host = req.headers.host ?? 'slopbop.com';

  // Grab the built app shell so React still boots for real users. index.html is
  // a real static file, served before rewrites, so this doesn't recurse.
  let html = await fetch(`https://${host}/index.html`).then(r => r.text());

  try {
    const embed = id ? await build(id, host) : null;
    if (embed) {
      html = setMeta(html, 'property="og:title"', embed.title);
      html = setMeta(html, 'property="og:description"', embed.description);
      html = setMeta(html, 'property="og:url"', embed.url);
      html = setMeta(html, 'property="og:image"', embed.image);
      html = setMeta(html, 'property="og:image:alt"', embed.imageAlt);
      html = setMeta(html, 'property="og:image:width"', String(embed.width));
      html = setMeta(html, 'property="og:image:height"', String(embed.height));
      html = setMeta(html, 'name="twitter:title"', embed.title);
      html = setMeta(html, 'name="twitter:description"', embed.description);
      html = setMeta(html, 'name="twitter:image"', embed.image);
      html = setMeta(html, 'name="twitter:image:alt"', embed.imageAlt);
      html = html.replace(
        /(<link\s+rel="canonical"\s+href=")[^"]*(")/i,
        `$1${esc(embed.url)}$2`,
      );
      // <title> and the plain description are what a search result shows, and
      // the crawler reads them off this same shell — so they can't stay generic.
      html = html.replace(
        /<title>[^<]*<\/title>/i,
        `<title>${esc(embed.title)} — SlopBop</title>`,
      );
      html = setMeta(html, 'name="description"', embed.description);
    }
  } catch {
    // Fall through with the untouched shell.
  }

  // Cache the rendered shell at the CDN so repeat crawls/loads skip the backend
  // round-trip, while staying fresh within a few minutes.
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');
  res.status(200).send(html);
}
