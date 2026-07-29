import {
  BaseMessageSignerWalletAdapter,
  WalletReadyState,
  type Adapter,
  type WalletName,
} from '@solana/wallet-adapter-base';
import { Keypair, Transaction, VersionedTransaction, PublicKey } from '@solana/web3.js';
import { ed25519 } from '@noble/curves/ed25519';
import bs58 from 'bs58';

/**
 * A local-only wallet backed by a keypair from the environment, so signing in as
 * an artist during development costs zero clicks and no popup.
 *
 * It is a real `Adapter`, which is the whole point: `useWallet`, the connect
 * button, the account sheet and `useWalletAuth` can't tell it apart from Phantom.
 * The signature it produces is a genuine ed25519 signature the backend verifies
 * normally — the only difference is that nothing asks you to approve it. Gated
 * content is therefore exercised through the real path, not a bypass.
 *
 * ── Setup ──
 *   .env:  VITE_DEV_WALLET_KEY=[12,34,...]     (or a base58 secret key)
 * Set it and you are that wallet on every reload; unset it and the normal wallet
 * flow comes back. That env var is the whole switch.
 *
 * ── Safety ──
 * `VITE_*` values are inlined into the bundle wherever they're read, so every
 * read here sits behind `import.meta.env.DEV`. That's `false` in a production
 * build, which makes these branches dead code and drops the secret before it can
 * reach `dist/`. The other half of the guarantee is `.gitignore`'s `*.env`, and
 * a rule only helps a file git isn't already tracking — check with
 * `git check-ignore -v .env` rather than assuming. Use a keypair minted for
 * development, one whose only job is owning a test artist, rather than exporting
 * the key of a wallet that holds anything.
 */

const DEV_WALLET_NAME = 'Dev Wallet' as WalletName<'Dev Wallet'>;

// Inline so the adapter needs no network and no asset pipeline. URL-encoded
// rather than base64: `btoa` throws on anything outside Latin-1, and this is a
// module-level constant — one emoji in here takes the whole app down with it.
const ICON =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
      '<rect width="32" height="32" rx="8" fill="#B6F833"/>' +
      '<text x="16" y="21" font-size="11" font-family="sans-serif" font-weight="bold" ' +
      'text-anchor="middle" fill="#051648">DEV</text>' +
      '</svg>',
  );

class DevWalletAdapter extends BaseMessageSignerWalletAdapter {
  readonly name = DEV_WALLET_NAME;
  readonly url = 'https://github.com/anza-xyz/wallet-adapter';
  readonly icon = ICON;
  readonly supportedTransactionVersions = new Set(['legacy', 0] as const);
  readonly readyState = WalletReadyState.Installed;

  private _publicKey: PublicKey | null = null;
  private _connecting = false;

  constructor(private readonly keypair: Keypair) {
    super();
  }

  get publicKey() {
    return this._publicKey;
  }

  get connecting() {
    return this._connecting;
  }

  async connect() {
    this._connecting = true;
    this._publicKey = this.keypair.publicKey;
    this._connecting = false;
    this.emit('connect', this._publicKey);
  }

  async disconnect() {
    this._publicKey = null;
    this.emit('disconnect');
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    // The 64-byte secret key is seed ‖ public key; ed25519 signs from the seed.
    return ed25519.sign(message, this.keypair.secretKey.slice(0, 32));
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
    if (transaction instanceof VersionedTransaction) transaction.sign([this.keypair]);
    else transaction.partialSign(this.keypair);
    return transaction;
  }
}

/** Accepts either the JSON byte array `solana-keygen` writes or a base58 secret key. */
function parseSecretKey(raw: string): Uint8Array {
  const trimmed = raw.trim();
  return trimmed.startsWith('[')
    ? Uint8Array.from(JSON.parse(trimmed) as number[])
    : bs58.decode(trimmed);
}

function devKeypair(): Keypair | null {
  const secret = import.meta.env.VITE_DEV_WALLET_KEY;
  if (!secret) return null;

  try {
    return Keypair.fromSecretKey(parseSecretKey(secret));
  } catch (err) {
    console.error(
      '[dev wallet] VITE_DEV_WALLET_KEY is not a valid secret key — expected a 64-byte ' +
        'JSON array or a base58 string. Falling back to the normal wallet flow.',
      err,
    );
    return null;
  }
}

/** The dev wallet to register, or null when the env var isn't set or we're not in dev. */
export function devWallet(): Adapter | null {
  // First statement in every export, deliberately: `import.meta.env.DEV` folds to
  // `false` at build time, so everything below becomes unreachable and the
  // adapter, the keypair parsing and the secret all drop out of `dist/` together.
  if (!import.meta.env.DEV) return null;

  const keypair = devKeypair();
  if (!keypair) return null;

  console.info(
    `%c[dev wallet]%c signing as ${keypair.publicKey.toBase58()} — unset VITE_DEV_WALLET_KEY for the real wallet flow.`,
    'color:#B6F833;font-weight:bold',
    'color:inherit',
  );
  return new DevWalletAdapter(keypair);
}

/**
 * Make the dev wallet the active choice before `WalletProvider` mounts and reads
 * the stored selection, so `autoConnect` has it connected by first paint and the
 * account sheet can go straight to signing.
 *
 * Overwrites whatever was chosen last: the env var is meant to be the one switch,
 * and a leftover "Phantom" in storage silently winning would defeat the point of
 * setting it.
 */
export function selectDevWallet() {
  if (!import.meta.env.DEV) return;
  if (!devKeypair()) return;
  try {
    localStorage.setItem('walletName', JSON.stringify(DEV_WALLET_NAME));
  } catch {
    // Storage blocked — the wallet is still selectable by hand from the modal.
  }
}
