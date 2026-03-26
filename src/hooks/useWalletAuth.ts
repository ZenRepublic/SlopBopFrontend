import { useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { getVerificationChallenge, type VerificationData } from '../services/walletAuth';

export function useWalletVerification() {
  const { publicKey, signMessage } = useWallet();

  const verify = useCallback(async (): Promise<VerificationData> => {
    if (!publicKey || !signMessage) {
      throw new Error('Wallet not connected or does not support message signing');
    }

    const walletAddress = publicKey.toBase58();
    const { message, challengeId } = await getVerificationChallenge(walletAddress);

    const messageBuffer = Buffer.from(message, 'utf-8');
    const signatureBuffer = await signMessage(messageBuffer);
    const signature = bs58.encode(signatureBuffer);

    return { walletAddress, challengeId, message, signature };
  }, [publicKey, signMessage]);

  return { verify };
}
