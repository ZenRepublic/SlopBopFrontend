import { apiFetch } from './client';

export interface VerificationData {
  walletAddress: string;
  challengeId: string;
  message: string;
  signature: string;
}

export const getVerificationChallenge = (walletAddress: string) =>
  apiFetch<{ challengeId: string; message: string }>('/slopbop/auth/challenge', {
    method: 'POST',
    body: JSON.stringify({ walletAddress }),
  });
