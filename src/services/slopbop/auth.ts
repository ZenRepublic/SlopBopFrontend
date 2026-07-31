import bs58 from 'bs58';
import { apiFetch, ApiError } from './client';
import * as session from './session';
import type { Artist } from './artists';

/**
 * Wallet sign-in — the flow, in one place.
 *
 *   challenge → sign locally → verify → token → /auth/me
 *
 * The endpoints below are the wire; `signInWithWallet` is the sequence. It lives
 * here rather than in a hook because none of it is React: the only thing the UI
 * contributes is a `signMessage` function from the wallet adapter, which is
 * passed in. Everything it learns goes straight into the session store, so
 * there's no second copy for a component to hold.
 *
 * The token is a 7-day JWT with no refresh. When it expires — or any authed call
 * comes back 401 — the session is simply over and re-login costs one signature.
 */

export interface VerificationData {
  walletAddress: string;
  challengeId: string;
  /** Echoed back byte-identical to what /challenge returned — the server string-compares it. */
  message: string;
  /** base58 of the ed25519 signature over the UTF-8 bytes of `message`. */
  signature: string;
}

interface ChallengeResponse {
  challengeId: string;
  message: string;
  walletAddress: string;
}

interface VerifyResponse {
  success: boolean;
  token: string;
  expires_in: number;
  wallet: string;
}

interface MeResponse {
  success: boolean;
  /** Who the token belongs to — a Solana public key. Echoes what we sent. */
  user_id: string;
  /**
   * The artists this user controls. **Empty is a valid, complete answer** — an
   * audience account — not a failed or lesser login. Several is equally valid;
   * don't assume the first element or a length of one.
   */
  artists: Artist[];
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/**
 * Ask for something to sign. Challenges are single-use with a 5-minute TTL, and
 * a failed verify burns one — always request a fresh challenge per attempt
 * rather than retrying with a spent `challengeId`.
 */
export const getChallenge = (walletAddress: string) =>
  apiFetch<ChallengeResponse>('/slopbop/auth/challenge', {
    method: 'POST',
    body: JSON.stringify({ walletAddress }),
  });

/** Trade a signed challenge for a session token. 401 = challenge spent/expired, or bad signature. */
export const verifyWallet = (data: VerificationData) =>
  apiFetch<VerifyResponse>('/slopbop/auth/verify', {
    method: 'POST',
    body: JSON.stringify(data),
  });

/** Who the current token belongs to, and what it controls. 401 = session over. */
export const fetchMe = () => apiFetch<MeResponse>('/slopbop/auth/me');

// ---------------------------------------------------------------------------
// Flows — the only things that write to the session store
// ---------------------------------------------------------------------------

/**
 * Prove a wallet and start a session. Prompts the wallet exactly once.
 *
 * Resolves when the session is live, rejects when it isn't; either way the store
 * already reflects the outcome, so a caller that only renders from the store can
 * ignore both. It rejects rather than swallowing so a caller who *does* need to
 * sequence something after a successful sign-in can await it.
 */
export async function signInWithWallet(
  walletAddress: string,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
): Promise<void> {
  session.beginSignIn();
  try {
    // A fresh challenge every attempt — they're single-use with a 5-minute TTL
    // and a failed verify spends one, so retrying an old id can only fail.
    const { challengeId, message } = await getChallenge(walletAddress);

    // Sign the exact UTF-8 bytes and hand `message` back untouched: the server
    // string-compares it, so any re-encoding or trim fails the check.
    const signature = bs58.encode(await signMessage(new TextEncoder().encode(message)));

    const { token, expires_in } = await verifyWallet({
      walletAddress,
      challengeId,
      message,
      signature,
    });
    session.setCredentials(walletAddress, token, expires_in);

    // Signed in the moment the token lands; what they control is a second,
    // non-fatal question — see refreshAccount.
    await refreshAccount();
    session.endSignIn();
  } catch (err) {
    session.signOut(messageFor(err));
    throw err;
  }
}

/**
 * Reload which artists the session controls. Called after sign-in and on boot
 * from a restored token.
 *
 * A failure here is not a failed session: the token is good, we just don't know
 * the artist list yet. A 401 is the exception, and `apiFetch` has already ended
 * the session by the time this sees it — hence no 401 branch.
 */
export async function refreshAccount(): Promise<void> {
  const me = await fetchMe();
  session.setArtists(me.artists);
}

function messageFor(err: unknown): string {
  if (err instanceof ApiError) {
    // 500 on an otherwise-working backend means JWT_SECRET isn't set server-side.
    if (err.status >= 500) return 'Sign-in is unavailable right now. Try again later.';
    if (err.status === 401) return 'Signature check failed. Try signing in again.';
  }
  // Wallet adapters reject with their own errors when the user dismisses the prompt.
  if (err instanceof Error && /reject|denied|cancel/i.test(err.message)) {
    return 'Signature request was cancelled.';
  }
  return 'Could not sign in with this wallet.';
}
