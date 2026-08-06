/**
 * Arweave media, and the single policy for surviving the gateway.
 *
 * Everything heavy — cover art, artist photos, song audio — lives on Arweave and
 * is served through `turbo-gateway.com`. That host 302s to a per-content sandbox
 * subdomain, and *that* hop blips: measured at roughly 3 bad fetches in 12 of a
 * hot URL, either an outright 504 or a stall the gateway itself only abandons
 * after ~50s. A retry almost always lands, and lands in about a second — so a
 * blip should never reach the user as an error.
 *
 * Every path that pulls bytes from here retries, and they share these numbers
 * instead of each inventing their own. The *mechanics* can't be shared: an
 * `<img>` and an `HTMLAudioElement` load through their own `src`, not through
 * `fetch()`, and forcing them through `fetch()` + blob URLs would cost audio its
 * range-based streaming and images the service worker's cache. Only the policy
 * is common, and this is where it lives.
 */

/** The media host. Mirrors the host regex in `vite.config.ts` — change both together. */
const GATEWAY_HOST = 'turbo-gateway.com';

/**
 * Whether a url points at our media host, and so is worth retrying.
 *
 * Matches the sandbox subdomains the gateway redirects to as well as the apex.
 * Deliberately narrow: a 404 from somewhere else is an answer, not a blip, and
 * local `/Images/…` paths should fail immediately rather than three times.
 */
export function isArweaveUrl(url: string): boolean {
  try {
    return new URL(url, window.location.href).hostname.endsWith(GATEWAY_HOST);
  } catch {
    return false;
  }
}

/** Extra attempts after the first. Three tries total, which clears the blip rate. */
export const ARWEAVE_MAX_RETRIES = 2;

/** Pause before a retry. Long enough not to hammer, short enough not to be felt. */
export const ARWEAVE_RETRY_DELAY_MS = 500;

/**
 * How long a media load may receive *no bytes at all* before it counts as dead.
 *
 * This measures silence, not slowness — callers push it forward on every
 * `progress` event, so a weak connection dragging ~1MB over a minute never trips
 * it. Well under the gateway's own ~50s timeout, which is far too long to make
 * someone watch a spinner.
 */
export const ARWEAVE_STALL_SILENCE_MS = 20_000;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * `fetch` with the retry policy above, for the paths that genuinely do fetch
 * bytes — the song and image downloads. Media *elements* don't come through
 * here; they retry by re-assigning their own `src` (see `Img`, `MusicPlayerContext`).
 *
 * Retries 5xx and network failures. A 4xx is the gateway answering, and asking
 * again won't change its mind. Throws the last failure once the budget is spent,
 * so callers keep their existing try/catch.
 */
export async function fetchArweave(url: string, init?: RequestInit): Promise<Response> {
  let lastError: unknown = new Error(`Could not fetch ${url}`);

  for (let attempt = 0; attempt <= ARWEAVE_MAX_RETRIES; attempt++) {
    if (attempt > 0) await delay(ARWEAVE_RETRY_DELAY_MS);
    try {
      const res = await fetch(url, init);
      if (res.status < 500) return res;
      lastError = new Error(`Arweave gateway answered ${res.status}`);
    } catch (err) {
      // A caller aborting is a decision, not a failure — don't retry over it.
      if ((err as DOMException)?.name === 'AbortError') throw err;
      lastError = err;
    }
  }

  throw lastError;
}
