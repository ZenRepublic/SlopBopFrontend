import { useState, useCallback, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import {
  getChallenge,
  verifyWallet,
  fetchMe,
  getToken,
  getTokenWallet,
  setToken,
  clearToken,
  ApiError,
  type Artist,
} from '../services/slopbop';

export interface WalletAuth {
  /** The wallet the live session belongs to, or null when signed out. */
  wallet: string | null;
  isAuthed: boolean;
  /** Every artist this wallet owns. Empty means the wallet isn't a signed artist. */
  myArtists: Artist[];
  /** A login or an /auth/me is in flight. */
  loading: boolean;
  error: string | null;
  /** Run the challenge → sign → verify → /auth/me round trip. Prompts the wallet. */
  login: () => Promise<void>;
  logout: () => void;
}

/**
 * The whole session layer: sign in with a wallet signature and hold on to the
 * resulting token and the artists it owns.
 *
 * Mounted once by AuthProvider — read it through `useAuth()` rather than calling
 * this directly, or you get a second, divergent copy of the session state.
 */
export function useWalletAuth(): WalletAuth {
  const { publicKey, signMessage, connected } = useWallet();

  const [wallet, setWallet] = useState<string | null>(getTokenWallet);
  const [myArtists, setMyArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(() => {
    clearToken();
    setWallet(null);
    setMyArtists([]);
    setError(null);
  }, []);

  // A stored token survives reloads, so on mount we know who we are but not yet
  // what we own — /auth/me fills that in. A 401 here means the week ran out.
  useEffect(() => {
    if (!getToken()) return;
    let cancelled = false;
    setLoading(true);
    fetchMe()
      .then(me => {
        if (cancelled) return;
        setWallet(me.wallet);
        setMyArtists(me.artists);
      })
      .catch(err => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) logout();
        else setError(messageFor(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [logout]);

  // A token names one wallet. If the adapter switches to a different address the
  // session no longer describes the person at the keyboard, so drop it.
  useEffect(() => {
    if (!wallet || !publicKey) return;
    if (publicKey.toBase58() !== wallet) logout();
  }, [publicKey, wallet, logout]);

  // Disconnecting the wallet ends the session too. Guarded on having actually
  // been connected: `connected` is false during autoConnect's startup, and
  // clearing there would throw away a perfectly good restored session.
  const wasConnected = useRef(false);
  useEffect(() => {
    if (connected) {
      wasConnected.current = true;
      return;
    }
    if (wasConnected.current) {
      wasConnected.current = false;
      logout();
    }
  }, [connected, logout]);

  const login = useCallback(async () => {
    if (!publicKey || !signMessage) {
      throw new Error('Wallet not connected or does not support message signing');
    }

    setLoading(true);
    setError(null);
    try {
      const walletAddress = publicKey.toBase58();

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
      setToken(walletAddress, token, expires_in);
      setWallet(walletAddress);

      const me = await fetchMe();
      setMyArtists(me.artists);
    } catch (err) {
      clearToken();
      setWallet(null);
      setMyArtists([]);
      setError(messageFor(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [publicKey, signMessage]);

  return { wallet, isAuthed: wallet !== null, myArtists, loading, error, login, logout };
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
