import { useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { BottomSheet } from '../primitives/BottomSheet';
import { ConnectWalletButton } from '../primitives/buttons/ConnectWalletButton';
import { useAuth } from '../context/AuthContext';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Hands navigation back to the NavBar so the route change keeps its transition. */
  onGoToArtist: (artistId: string) => void;
}

/**
 * Signing in, and nothing else. The sheet exists only while there's a question
 * to answer — connect a wallet, or hear that this one isn't on the label. The
 * moment a signed-in wallet turns out to own exactly one artist there's nothing
 * left to ask, so it closes itself and sends you to that artist's page.
 */
export function AccountSheet({ open, onClose, onGoToArtist }: Props) {
  const { publicKey } = useWallet();
  const { isAuthed, myArtists, loading, error, login } = useAuth();

  const address = publicKey?.toBase58() ?? null;

  // Connecting is the whole gesture — the signature prompt follows on its own
  // rather than behind a second button nobody asked for. Once per address, so a
  // refused or failed signature waits for an explicit retry instead of looping.
  const attempted = useRef<string | null>(null);
  useEffect(() => {
    if (!open) {
      attempted.current = null;
      return;
    }
    if (!address || isAuthed || loading || attempted.current === address) return;
    attempted.current = address;
    login().catch(() => {
      /* surfaced through `error` below */
    });
  }, [open, address, isAuthed, loading, login]);

  // One artist and you're in: the sheet had one question and it's answered.
  const soleArtist = isAuthed && myArtists.length === 1 ? myArtists[0] : null;
  useEffect(() => {
    if (!open || !soleArtist) return;
    onClose();
    onGoToArtist(soleArtist.artist_id);
  }, [open, soleArtist, onClose, onGoToArtist]);

  return (
    <BottomSheet open={open} onClose={onClose} title="Account" fitContent>
      <div className="flex flex-col items-center gap-lg text-center pb-xl">
        {loading ? (
          <>
            <div className="spinner large processing" />
            <p className="text-muted text-sm">
              Check your wallet — sign the message to prove the wallet is yours.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm">{copyFor({ address, isAuthed, artistCount: myArtists.length })}</p>

            {error && <p className="text-sm text-accent">{error}</p>}

            {/* More than one artist on the wallet: it can't pick for you. */}
            {isAuthed && myArtists.length > 1 && (
              <div className="w-full flex flex-col gap-sm">
                {myArtists.map(artist => (
                  <button
                    key={artist.artist_id}
                    type="button"
                    className="secondary w-full"
                    onClick={() => {
                      onClose();
                      onGoToArtist(artist.artist_id);
                    }}
                  >
                    {artist.name}
                  </button>
                ))}
              </div>
            )}

            {error && address && (
              <button type="button" className="primary" onClick={() => void login()}>
                Try again
              </button>
            )}

            <ConnectWalletButton />
          </>
        )}
      </div>
    </BottomSheet>
  );
}

function copyFor({
  address,
  isAuthed,
  artistCount,
}: {
  address: string | null;
  isAuthed: boolean;
  artistCount: number;
}) {
  if (!address && !isAuthed) return 'Connect the wallet your artist is signed to.';
  if (!isAuthed) return 'Sign the message to continue.';
  if (artistCount === 0) return 'This wallet is not a signed artist on the SlopBop music label.';
  return 'Pick which of your artists to open.';
}
