import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { checkAdmin } from '../services/api';

export function useAdmin() {
  const { publicKey, connected } = useWallet();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!connected || !publicKey) {
      setIsAdmin(false);
      return;
    }

    setLoading(true);
    checkAdmin(publicKey.toBase58())
      .then(setIsAdmin)
      .catch(() => setIsAdmin(false))
      .finally(() => setLoading(false));
  }, [connected, publicKey]);

  return { isAdmin, loading };
}
