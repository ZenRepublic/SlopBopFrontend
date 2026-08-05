import { createHash } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import { STICKERS, isKnownSlug, safeTarget } from './_slugs.js';
import { keys, redis, scanDay } from './_store.js';

// ── /go/:slug — the endpoint every sticker's QR points at ──────────────────
//
// Resolve the slug to wherever it points *right now*, tally the scan, and hand
// the phone onward. See `slugs.ts` for why the indirection exists.
//
// The whole thing is one Redis round trip: the read of the target and the
// writes of the counters go out together, because the person is standing in
// the street waiting for it.

/** Buckets a day of counters expires after. Long enough to compare campaigns,
 *  short enough that the store never becomes something to maintain. */
const BUCKET_TTL_SECONDS = 400 * 24 * 60 * 60;

/** How many recent scans to keep for the "is this real or is it me testing"
 *  question the dashboard exists to answer. */
const RECENT_LIMIT = 100;

/**
 * Things that fetch a URL without a human behind them: search crawlers, and —
 * far more common for a link people paste around — the preview unfurlers of
 * chat apps. One share of a /go/ link into a group chat can otherwise mint a
 * dozen "scans" and make a dead sticker look alive.
 */
const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|discord|slack|twitter|linkedin|embedly|preview|curl|wget|python-requests|headless|lighthouse|monitor|pingdom|uptime/i;

function isAutomated(req: VercelRequest): boolean {
  const ua = String(req.headers['user-agent'] ?? '');
  if (!ua || BOT_UA.test(ua)) return true;
  // Browsers speculatively fetching a link the user has merely hovered or that
  // sits in the viewport. A prefetch is not an intent to visit.
  const purpose = String(req.headers['sec-purpose'] ?? req.headers['purpose'] ?? '');
  return /prefetch|preview/i.test(purpose);
}

/**
 * A stable-but-anonymous handle for one scanner, for one slug, for one day.
 *
 * Salted with the slug and the day and never stored in reversible form, so it
 * supports exactly one question — "how many different phones" — and cannot be
 * turned back into an IP or followed across days. The counter it feeds is a
 * HyperLogLog, which keeps no members at all.
 */
function fingerprint(req: VercelRequest, slug: string, day: string): string {
  const ip = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
  const ua = String(req.headers['user-agent'] ?? '');
  return createHash('sha256').update(`${slug}|${day}|${ip}|${ua}`).digest('hex').slice(0, 16);
}

/** Coarse location, straight off Vercel's edge headers — country and city only,
 *  which is all "did the Užupis batch work" needs. */
function place(req: VercelRequest): string {
  const city = decodeURIComponent(String(req.headers['x-vercel-ip-city'] ?? '')) || '?';
  const country = String(req.headers['x-vercel-ip-country'] ?? '') || '?';
  return `${city}, ${country}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const raw = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug;
  const slug = String(raw ?? '').toLowerCase();

  // An unknown slug is a mistyped or retired sticker. Send it to the front
  // page rather than showing an error — someone is holding a phone, and the
  // homepage is a better outcome for them than a 404 either way.
  if (!isKnownSlug(slug)) {
    res.setHeader('Cache-Control', 'no-store');
    res.redirect(302, 'https://www.slopbop.com/?ref=sticker');
    return;
  }

  const day = scanDay();
  const counted = !isAutomated(req);

  const commands: (string | number)[][] = [['GET', keys.target(slug)]];

  if (counted) {
    const scan = JSON.stringify({ t: new Date().toISOString(), p: place(req) });
    commands.push(
      ['INCR', keys.hits(slug)],
      ['INCR', keys.daily(slug, day)],
      ['EXPIRE', keys.daily(slug, day), BUCKET_TTL_SECONDS],
      ['PFADD', keys.uniq(slug, day), fingerprint(req, slug, day)],
      ['EXPIRE', keys.uniq(slug, day), BUCKET_TTL_SECONDS],
      ['LPUSH', keys.recent(slug), scan],
      ['LTRIM', keys.recent(slug), 0, RECENT_LIMIT - 1],
    );
  }

  const [stored] = await redis(commands);

  // The live target if one has been set and parses; otherwise the fallback
  // compiled into the registry. This is the line that keeps a sticker alive
  // through an outage, an unset slug, or a fat-fingered URL.
  const target = safeTarget(typeof stored === 'string' ? stored : null) ?? STICKERS[slug].fallback;

  // 302, never 301, and no-store on top of it: the destination is meant to
  // change, and a cached redirect would both pin an old target and stop the
  // scan ever reaching us again. `?ref=` lets the destination page see where
  // its traffic came from without another moving part.
  const url = new URL(target);
  if (!url.searchParams.has('ref')) url.searchParams.set('ref', `sticker-${slug}`);

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.redirect(302, url.toString());
}
