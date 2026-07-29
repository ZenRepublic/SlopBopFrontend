import { apiFetch } from './client';
import type { Artist } from './artists';

/**
 * Wallet sign-in. Three calls, in order:
 *
 *   challenge → sign locally → verify → token
 *
 * The token is a 7-day JWT with no refresh; when it expires (or any authed call
 * comes back 401) the session is simply over and re-login costs one signature.
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
  wallet: string;
  /** Every artist this wallet owns. Empty is a valid answer, not an error. */
  artists: Artist[];
}

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

/** Who the current token belongs to, and what it owns. 401 = session over. */
export const fetchMe = () => apiFetch<MeResponse>('/slopbop/auth/me');
