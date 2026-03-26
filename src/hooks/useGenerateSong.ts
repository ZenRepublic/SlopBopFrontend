import { useCallback, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletVerification } from './useWalletAuth';
import { generateSong } from '../services/api';

export function useGenerateSong() {
  const { publicKey } = useWallet();
  const { verify } = useWalletVerification();
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async (artistId: string, theme: string, collectionId?: string): Promise<void> => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    try {
      const { walletAddress, challengeId, message, signature } = await verify();
      await generateSong({
        artistId,
        theme,
        collectionId,
        walletAddress,
        challengeId,
        message,
        signature,
      });
    } finally {
      setLoading(false);
    }
  }, [publicKey, verify]);

  return { generate, loading };
}
