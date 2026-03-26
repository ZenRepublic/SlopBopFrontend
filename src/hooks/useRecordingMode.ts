import { useCallback, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletVerification } from './useWalletAuth';
import { setRecordingMode } from '../services/api';

export function useRecordingMode() {
  const { publicKey } = useWallet();
  const { verify } = useWalletVerification();
  const [loading, setLoading] = useState(false);

  const toggleRecording = useCallback(async (collectionId: string, isRecording: boolean) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    try {
      const { walletAddress, challengeId, message, signature } = await verify();
      await setRecordingMode({
        collectionId,
        isRecording,
        walletAddress,
        challengeId,
        message,
        signature,
      });
    } finally {
      setLoading(false);
    }
  }, [publicKey, verify]);

  return { toggleRecording, loading };
}
