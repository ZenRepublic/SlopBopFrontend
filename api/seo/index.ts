import type { VercelRequest, VercelResponse } from '@vercel/node';

// The `.js` on these relative imports is load-bearing, not a typo: package.json
// says "type": "module", so Vercel ships these as real ESM and Node's resolver
// does no extension guessing. Dropping it crashes the function on every request
// with ERR_MODULE_NOT_FOUND — a 500 before any of our code runs.
import { serveEmbed } from './_appShell.js';
import artist from './_artist.js';
import collection from './_collection.js';

// ── One function behind every shareable route ─────────────────────────────
//
// `/artists/:id`, `/albums/:id`, `/mixtapes/:id` and `/jams/:id` all land here.
// Which embed to build comes from `?kind=` on the rewrite in vercel.json, not
// from the request path — so the route table lives in one file instead of being
// spelled out a second time as a directory tree under `api/`.
//
// Albums, mixtapes and jams share `collection` because they're one backend
// resource discriminated by `type`; see `_collection.ts`.

const HANDLERS: Record<string, (req: VercelRequest, res: VercelResponse) => Promise<void>> = {
  artist,
  collection,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const kind = String(Array.isArray(req.query.kind) ? req.query.kind[0] : (req.query.kind ?? ''));
  const build = HANDLERS[kind];

  // No kind means a rewrite is wrong, which is a deploy-time mistake — but a
  // visitor shouldn't see it. Serve the untouched app shell: React still
  // renders the page, only the unfurl falls back to the site-wide banner.
  if (!build) return serveEmbed(req, res, async () => null);

  return build(req, res);
}
