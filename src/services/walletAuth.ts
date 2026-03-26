import { apiFetch } from './api';

export interface VerificationData {
  walletAddress: string;
  challengeId: string;
  message: string;
  signature: string;
}

export const getVerificationChallenge = (walletAddress: string) =>
  apiFetch<{ challengeId: string; message: string }>('/msi/verification/challenge', {
    method: 'POST',
    body: JSON.stringify({ walletAddress }),
  });
