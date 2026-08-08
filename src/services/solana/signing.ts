import bs58 from 'bs58';

/**
 * How a signed message crosses the wire: base58 of the raw ed25519 bytes, over
 * the message's UTF-8 exactly as issued. Both halves live here because getting
 * either wrong fails verification the same way.
 */
export async function signMessageBase58(
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
  message: string,
): Promise<string> {
  return bs58.encode(await signMessage(new TextEncoder().encode(message)));
}
