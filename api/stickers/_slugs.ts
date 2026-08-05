// ── Which stickers exist, and where they point by default ─────────────────
//
// A sticker on a wall is permanent; what it should point at is not. So the
// printed QR never encodes a destination — it encodes `slopbop.com/go/<slug>`,
// and the slug is resolved to a target at scan time.
//
// This registry is committed rather than stored, because it answers two things
// the store can't: which slugs exist (so `dashboard.ts` can list them without
// scanning the keyspace), and where each points when nothing has overridden it.
// The *live* target lives in Redis and wins whenever it's set — see `store.ts`.
//
// That fallback is the reason a sticker can't dead-end. If Redis is unreachable
// or a slug was never configured, `redirect.ts` still sends the phone somewhere
// sensible. A wall is not a place you can push a hotfix to.

export interface Sticker {
  /** Short human name, shown in the dashboard. */
  label: string;
  /** What this variant is testing — the reason it's a separate slug. */
  intent: string;
  /** Where it points until someone retargets it. Must be absolute http(s). */
  fallback: string;
}

export const STICKERS: Record<string, Sticker> = {
  listen: {
    label: 'Listen',
    intent: 'Passive pitch — hear what the label sounds like.',
    fallback: 'https://slopbop.com/roster',
  },
  write: {
    label: 'Write',
    intent: 'Active pitch — you write the lyrics, an artist records them.',
    fallback: 'https://slopbop.com',
  },
};

export function isKnownSlug(slug: string): slug is keyof typeof STICKERS {
  return Object.prototype.hasOwnProperty.call(STICKERS, slug);
}

/**
 * Only absolute http(s) URLs are ever emitted in a Location header.
 *
 * Targets are operator-set, so this isn't an untrusted-input problem — it's a
 * typo problem. A missing scheme would produce a broken redirect on a sticker
 * that's already on a wall, and `javascript:` in a Location is worth refusing
 * on principle rather than reasoning about.
 */
export function safeTarget(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}
