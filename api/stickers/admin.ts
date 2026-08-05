import { timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import { STICKERS, isKnownSlug, safeTarget } from './_slugs.js';
import { keys, recentDays, redis, scanDay, storeConfigured } from './_store.js';

// ── /sticker-admin — retarget a sticker, and see whether it's working ──────
//
// Deliberately *not* a React route. It's an operator tool, not part of the
// product: putting it in `src/features/` would ship an admin surface in every
// visitor's bundle and put a page in the app that isn't for them. Served whole
// from here instead — no bundle cost, no route in the SPA, nothing to hide in
// the nav.
//
// The use case is standing outside with a phone: a jam just went live and the
// sticker downtown should point at it now. So it's one screen, thumb-sized
// targets, and no build step between deciding and it being true.

const TOKEN = process.env.STICKER_ADMIN_TOKEN || '';
const COOKIE = 'sb_sticker_admin';
const DAYS = 7;

/**
 * There is no rate limiting here — this page has no database behind its login
 * and shouldn't gain one, since a store outage would then lock you out of the
 * tool you use when something's wrong. Refusing a short token is the cheaper
 * guarantee: brute force stops being worth modelling above this length.
 */
const MIN_TOKEN_LENGTH = 24;

function tokenOk(candidate: string): boolean {
  if (!TOKEN || !candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(TOKEN);
  // Length is compared first and separately: timingSafeEqual throws on a length
  // mismatch, and length alone leaks nothing an attacker can't measure anyway.
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * The session is a cookie and nothing else.
 *
 * An earlier version took the token from `?key=`, which is how most one-page
 * admin tools do it and is worse than it looks: query strings are recorded in
 * Vercel's access logs, kept in browser history, and pasted into chats along
 * with the link. The token now only ever travels in a POST body.
 */
function authed(req: VercelRequest): boolean {
  const cookie = String(req.headers.cookie ?? '')
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(`${COOKIE}=`));
  return cookie ? tokenOk(decodeURIComponent(cookie.slice(COOKIE.length + 1))) : false;
}

function loginPage(failed: boolean): string {
  return page(`
    <h1>Sticker links</h1>
    <p class="sub">${failed ? 'Wrong key.' : 'Enter the admin key.'}</p>
    <form method="POST" class="card">
      <label for="key">Admin key</label>
      <input id="key" type="password" name="key" autocomplete="current-password" autofocus />
      <div class="row"><button type="submit">Unlock</button></div>
    </form>`);
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface SlugStats {
  slug: string;
  live: string | null;
  effective: string;
  total: number;
  days: { day: string; hits: number; uniq: number }[];
  recent: { t: string; p: string }[];
}

const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0);

async function loadStats(): Promise<SlugStats[]> {
  const slugs = Object.keys(STICKERS);
  const days = recentDays(DAYS);

  // One pipeline for the whole dashboard. Per slug: the live target, the total,
  // a hits-and-uniques pair per day, and the recent-scan tail.
  const perSlug = 3 + days.length * 2;
  const commands: (string | number)[][] = [];
  for (const slug of slugs) {
    commands.push(['GET', keys.target(slug)]);
    commands.push(['GET', keys.hits(slug)]);
    for (const day of days) commands.push(['GET', keys.daily(slug, day)]);
    for (const day of days) commands.push(['PFCOUNT', keys.uniq(slug, day)]);
    commands.push(['LRANGE', keys.recent(slug), 0, 19]);
  }

  const out = await redis(commands);

  return slugs.map((slug, i) => {
    const base = i * perSlug;
    const live = safeTarget(typeof out[base] === 'string' ? (out[base] as string) : null);
    const recentRaw = Array.isArray(out[base + 2 + days.length * 2])
      ? (out[base + 2 + days.length * 2] as string[])
      : [];

    return {
      slug,
      live,
      effective: live ?? STICKERS[slug].fallback,
      total: num(out[base + 1]),
      days: days.map((day, d) => ({
        day,
        hits: num(out[base + 2 + d]),
        uniq: num(out[base + 2 + days.length + d]),
      })),
      recent: recentRaw
        .map(entry => {
          try {
            return JSON.parse(entry) as { t: string; p: string };
          } catch {
            return null;
          }
        })
        .filter((e): e is { t: string; p: string } => e !== null),
    };
  });
}

// ── Rendering ──────────────────────────────────────────────────────────────
// Palette is copied from src/styles/theme.css rather than imported: this file
// is served by a serverless function and never sees the app's CSS. It's a
// handful of values on one operator page — if the brand shifts, this is a
// find-and-replace, not a reskin.

const CSS = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 20px 16px 64px;
    background: #051648; color: #D3D6D7;
    font: 15px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  .wrap { max-width: 560px; margin: 0 auto; }
  h1 { font-size: 20px; letter-spacing: .12em; text-transform: uppercase; color: #B6F833; margin: 0 0 4px; }
  .sub { color: #77939E; font-size: 13px; margin: 0 0 24px; }
  .card {
    background: #0C286F; border: 1px solid rgba(119,147,158,.3);
    border-radius: 14px; padding: 16px; margin-bottom: 18px;
  }
  .head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  .slug { font-size: 17px; font-weight: 700; color: #B6F833; }
  .slug small { color: #77939E; font-weight: 400; font-size: 12px; }
  .intent { color: #C1D49C; font-size: 12.5px; margin: 6px 0 14px; }
  .stats { display: flex; gap: 10px; margin-bottom: 14px; }
  .stat { flex: 1; background: #051648; border-radius: 10px; padding: 10px 12px; }
  .stat b { display: block; font-size: 22px; color: #fff; line-height: 1.1; }
  .stat span { font-size: 11px; color: #77939E; text-transform: uppercase; letter-spacing: .06em; }
  .bars { display: flex; align-items: flex-end; gap: 5px; height: 46px; margin-bottom: 6px; }
  .bars div { flex: 1; background: #113CB2; border-radius: 3px 3px 0 0; min-height: 2px; position: relative; }
  .bars div.today { background: #B6F833; }
  .axis { display: flex; gap: 5px; font-size: 9.5px; color: #77939E; margin-bottom: 16px; }
  .axis span { flex: 1; text-align: center; }
  label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: .07em; color: #77939E; margin-bottom: 6px; }
  input[type=url], input[type=password] {
    width: 100%; padding: 12px; border-radius: 10px; font-size: 15px;
    background: #051648; color: #D3D6D7; border: 1px solid rgba(119,147,158,.4);
  }
  .row { display: flex; gap: 8px; margin-top: 10px; }
  button {
    flex: 1; padding: 12px; border: 0; border-radius: 10px; font-size: 14px;
    font-weight: 700; cursor: pointer; background: #B6F833; color: #051648;
  }
  button.ghost { background: transparent; color: #77939E; border: 1px solid rgba(119,147,158,.4); flex: 0 0 auto; padding: 12px 16px; }
  .qr { font-size: 12px; color: #77939E; margin-top: 14px; word-break: break-all; }
  .qr b { color: #D3D6D7; }
  .recent { margin-top: 14px; font-size: 11.5px; color: #77939E; }
  .recent summary { cursor: pointer; color: #C1D49C; }
  .recent li { list-style: none; padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,.06); }
  .recent ul { padding: 8px 0 0; margin: 0; max-height: 220px; overflow-y: auto; }
  .warn { background: #F5A623; color: #051648; padding: 12px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 18px; }
  .flash { background: #B6F833; color: #051648; padding: 12px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 18px; font-weight: 600; }
`;

function renderCard(s: SlugStats, origin: string): string {
  const meta = STICKERS[s.slug];
  const today = s.days[0];
  const week = s.days.reduce((sum, d) => sum + d.hits, 0);
  const peak = Math.max(1, ...s.days.map(d => d.hits));

  // Oldest → newest reads left-to-right the way a chart should.
  const chrono = [...s.days].reverse();
  const bars = chrono
    .map(
      d =>
        `<div class="${d.day === today.day ? 'today' : ''}" style="height:${Math.round(
          (d.hits / peak) * 100,
        )}%" title="${d.day}: ${d.hits} scans, ${d.uniq} phones"></div>`,
    )
    .join('');
  const axis = chrono.map(d => `<span>${d.day.slice(8)}</span>`).join('');

  const recent = s.recent.length
    ? `<details class="recent"><summary>Last ${s.recent.length} scans</summary><ul>${s.recent
        .map(
          e =>
            `<li>${esc(new Date(e.t).toLocaleString('en-GB', { timeZone: 'Europe/Vilnius' }))} — ${esc(e.p)}</li>`,
        )
        .join('')}</ul></details>`
    : '';

  return `
    <div class="card">
      <div class="head">
        <span class="slug">${esc(meta.label)} <small>/go/${esc(s.slug)}</small></span>
      </div>
      <p class="intent">${esc(meta.intent)}</p>

      <div class="stats">
        <div class="stat"><b>${s.total}</b><span>All time</span></div>
        <div class="stat"><b>${week}</b><span>7 days</span></div>
        <div class="stat"><b>${today.uniq}</b><span>Phones today</span></div>
      </div>

      <div class="bars">${bars}</div>
      <div class="axis">${axis}</div>

      <form method="POST">
        <input type="hidden" name="slug" value="${esc(s.slug)}" />
        <label for="t-${esc(s.slug)}">Points at${s.live ? '' : ' (fallback — nothing set)'}</label>
        <input id="t-${esc(s.slug)}" type="url" name="target" value="${esc(s.effective)}"
               placeholder="https://www.slopbop.com/jams/…" required />
        <div class="row">
          <button type="submit">Point it here</button>
          ${s.live ? '<button class="ghost" type="submit" name="reset" value="1">Reset</button>' : ''}
        </div>
      </form>

      <p class="qr">QR encodes <b>${esc(origin)}/go/${esc(s.slug)}</b></p>
      ${recent}
    </div>`;
}

function page(body: string): string {
  return `<!doctype html><html lang="en"><head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Sticker links — SlopBop</title>
    <style>${CSS}</style>
  </head><body><div class="wrap">${body}</div></body></html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Nothing here may be indexed, cached, or leak a referrer to wherever a
  // target points.
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');

  if (!TOKEN) {
    res.status(503).send(page('<h1>Not configured</h1><p class="sub">Set STICKER_ADMIN_TOKEN in the Vercel project environment.</p>'));
    return;
  }

  // Failing loudly beats quietly guarding a change-anything page with a short
  // password someone picked in a hurry.
  if (TOKEN.length < MIN_TOKEN_LENGTH) {
    res.status(503).send(page(`<h1>Weak key</h1><p class="sub">STICKER_ADMIN_TOKEN must be at least ${MIN_TOKEN_LENGTH} characters. Generate one with <code>openssl rand -base64 32</code>.</p>`));
    return;
  }

  const body = (req.body ?? {}) as Record<string, string>;
  let isAuthed = authed(req);

  // An unauthenticated POST is a login attempt and nothing else — it must not
  // fall through to the retarget handling below.
  if (!isAuthed) {
    if (req.method === 'POST' && body.key) {
      if (!tokenOk(String(body.key))) {
        res.status(401).send(loginPage(true));
        return;
      }
      isAuthed = true;
      res.setHeader(
        'Set-Cookie',
        `${COOKIE}=${encodeURIComponent(String(body.key))}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=7776000`,
      );
    } else {
      res.status(401).send(loginPage(false));
      return;
    }
  }

  const origin = `https://${req.headers.host ?? 'slopbop.com'}`;
  let flash = '';

  if (req.method === 'POST') {
    const slug = String(body.slug ?? '');

    if (isKnownSlug(slug)) {
      if (body.reset) {
        await redis([['DEL', keys.target(slug)]]);
        flash = `/go/${slug} reset to its fallback.`;
      } else {
        const target = safeTarget(String(body.target ?? ''));
        if (!target) {
          flash = 'That needs to be a full https:// URL — nothing changed.';
        } else {
          const [ok] = await redis([['SET', keys.target(slug), target]]);
          flash = ok ? `/go/${slug} now points at ${target}` : 'Store unreachable — nothing changed.';
        }
      }
    }
  }

  const stats = await loadStats();

  const banner = !storeConfigured
    ? '<div class="warn">No Redis credentials on this deployment. Stickers still redirect to their fallbacks, but nothing is being counted and targets can\'t be changed.</div>'
    : '';

  res.status(200).send(
    page(`
      <h1>Sticker links</h1>
      <p class="sub">Change where a printed QR goes. Takes effect on the next scan — ${esc(scanDay())}, Vilnius time.</p>
      ${banner}
      ${flash ? `<div class="flash">${esc(flash)}</div>` : ''}
      ${stats.map(s => renderCard(s, origin)).join('')}
    `),
  );
}
