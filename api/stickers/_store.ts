// ── Where live targets and scan counts are kept ───────────────────────────
//
// Upstash Redis over its REST API — no TCP, no connection pooling, no npm
// dependency, and one round trip can serve a whole request (read the target
// and write the counters in a single pipeline). Credentials come from the
// Vercel/Upstash integration; either naming works.

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

export const storeConfigured = Boolean(REDIS_URL && REDIS_TOKEN);

type Command = (string | number)[];

/**
 * Run commands as one pipelined round trip. Results come back positionally,
 * with `null` in any slot that errored.
 *
 * Deliberately impatient: every caller is on the hot path of someone standing
 * in the street holding a phone at a wall. A 1.5s budget, and any failure
 * resolves to nulls rather than throwing — losing a tally is acceptable,
 * failing the redirect is not.
 */
export async function redis(commands: Command[]): Promise<(unknown | null)[]> {
  if (!storeConfigured || commands.length === 0) return commands.map(() => null);

  try {
    const res = await fetch(`${REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return commands.map(() => null);

    const body = (await res.json()) as { result?: unknown; error?: string }[];
    if (!Array.isArray(body)) return commands.map(() => null);
    return commands.map((_, i) => (body[i] && body[i].error ? null : (body[i]?.result ?? null)));
  } catch {
    return commands.map(() => null);
  }
}

/**
 * Every key in one place, so the redirect and the dashboard can't drift on a
 * name — a mismatch there reads as "zero scans", which looks like a failed
 * campaign rather than a bug.
 */
export const keys = {
  /** The live target. Absent means "use the registry fallback". */
  target: (slug: string) => `link:${slug}:target`,
  /** Scans since forever. */
  hits: (slug: string) => `link:${slug}:hits`,
  /** Scans on one day. */
  daily: (slug: string, day: string) => `link:${slug}:hits:${day}`,
  /** HyperLogLog of distinct scanners on one day — keeps no members at all. */
  uniq: (slug: string, day: string) => `link:${slug}:uniq:${day}`,
  /** Capped list of recent scans, for eyeballing whether they're real. */
  recent: (slug: string) => `link:${slug}:recent`,
};

/**
 * Scans are bucketed by *Vilnius* days, not UTC.
 *
 * The question these counters answer is "did last night's postering run do
 * anything" — a UTC bucket would split a Friday night across two rows and make
 * that harder to read than it needs to be.
 */
export const SCAN_TZ = 'Europe/Vilnius';

export function scanDay(at: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD, which sorts lexicographically the same as
  // chronologically — the convention the sim's timestamps already use.
  return new Intl.DateTimeFormat('en-CA', { timeZone: SCAN_TZ }).format(at);
}

/** The last `n` days as YYYY-MM-DD, most recent first. */
export function recentDays(n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.push(scanDay(new Date(Date.now() - i * 86_400_000)));
  }
  return out;
}
