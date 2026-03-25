/**
 * Network configuration based on VITE_SOL_NETWORK environment variable.
 * Set VITE_SOL_NETWORK to 'mainnet' or 'devnet' in .env
 */

type SolanaNetwork = 'devnet' | 'mainnet-beta';

const networkEnv = import.meta.env.VITE_SOL_NETWORK || 'devnet';

// Map env value to Solana cluster name
export const SOLANA_NETWORK: SolanaNetwork =
  networkEnv === 'mainnet' ? 'mainnet-beta' : 'devnet';

// Chain identifier for Mobile Wallet Adapter
export const SOLANA_CHAIN = `solana:${networkEnv}` as `solana:${string}`;

// Helius RPC URL based on network
const HELIUS_API_KEY = import.meta.env.VITE_HELIUS_API_KEY || '';

export const HELIUS_RPC_URL = networkEnv === 'mainnet'
  ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
  : `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

// Helper to check if we're on mainnet
export const IS_MAINNET = networkEnv === 'mainnet';
