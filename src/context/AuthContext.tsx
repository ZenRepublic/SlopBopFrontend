import { createContext, useContext, ReactNode } from 'react';
import { useWalletAuth, type WalletAuth } from '../hooks/useWalletAuth';

/**
 * The wallet session, app-wide. A singleton because the token and the artists it
 * owns are read from the nav, the account sheet and any owner-gated UI at once —
 * and because logging in costs a wallet signature, so it happens exactly once.
 *
 * Note what this deliberately does *not* do: decide whether you own the artist
 * you're looking at. That answer is `is_owner` on the artist's own fetch, so the
 * server stays the one place that decides, rather than the client comparing
 * `owner_wallet` to a public key it also controls.
 */
const AuthContext = createContext<WalletAuth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useWalletAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
