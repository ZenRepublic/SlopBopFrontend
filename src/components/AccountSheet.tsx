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
 * Signing in, and where signing in leads. The sheet exists while there's a
 * question to answer — connect a wallet, sign the message, or pick which of
 * several artists to open. The moment a signed-in user turns out to control
 * exactly one artist there's nothing left to ask, so it closes itself and sends
 * you to that artist's page.
 *
 * **Controlling no artist is a finished, valid state**, not a rejection. Most
 * signed-in people are audience: they vote and request songs and never run an
 * artist. So a session with an empty artist list is shown as what it is — signed
 * in, with the wallet on screen and a way back out — rather than being told it
 * isn't on the label.
 *
 * `ConnectWalletButton` is the single accent action throughout; it doubles as
 * sign-out, since disconnecting the wallet ends the session too. Anything else
 * the sheet offers stays quiet so the primary step is never in competition.
 */
export function AccountSheet({ open, onClose, onGoToArtist }: Props) {
  const { publicKey } = useWallet();
  const { isAuthed, artists, loading, error, login } = useAuth();

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
  const soleArtist = isAuthed && artists.length === 1 ? artists[0] : null;
  useEffect(() => {
    if (!open || !soleArtist) return;
    onClose();
    onGoToArtist(soleArtist.artist_id);
  }, [open, soleArtist, onClose, onGoToArtist]);

  return (
    <BottomSheet open={open} onClose={onClose} title="Login Portal" fitContent>
      {/* Only the horizontal inset — `.bottom-sheet-content` already owns the
          vertical padding, and doubling it left the copy stranded. */}
      <div className="flex flex-col items-center gap-lg text-center px-md">
        {loading ? (
          <>
            <div className="spinner large processing" />
            <p>Sign the message in your wallet to prove it&apos;s yours.</p>
            <p className="subtle text-xs">No transaction, no fee.</p>
          </>
        ) : (
          <>
            <Copy address={address} isAuthed={isAuthed} artistCount={artists.length} />

            {error && <p className="text-danger">{error}</p>}

            {/* Several artists on one account — it can't pick for you. Quiet,
                bordered rows so the accent stays with the wallet button. */}
            {isAuthed && artists.length > 1 && (
              <div className="w-full flex flex-col gap-sm">
                {artists.map(artist => (
                  <button
                    key={artist.artist_id}
                    type="button"
                    className="w-full rounded-lg border border-border px-lg py-md font-display uppercase text-sm tracking-wide active:opacity-70 transition-opacity"
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

            <ConnectWalletButton />

            {error && address && (
              <button
                type="button"
                onClick={() => void login()}
                className="text-sm text-muted underline underline-offset-4 active:opacity-70 transition-opacity"
              >
                Try signing again
              </button>
            )}
          </>
        )}
      </div>
    </BottomSheet>
  );
}

function Copy({
  address,
  isAuthed,
  artistCount,
}: {
  address: string | null;
  isAuthed: boolean;
  artistCount: number;
}) {
  // Signed in, no artist — the ordinary case, and a complete one. It says what
  // the session *is* rather than what it lacks: the previous copy read as a
  // rejection ("isn't signed to any artist") for what is simply an audience
  // account. The address is echoed so there's proof of which wallet is live,
  // and ConnectWalletButton below is the way back out.
  if (isAuthed && artistCount === 0) {
    return (
      <>
        <p>
          Signed in as <span className="highlight">{shorten(address)}</span>.
        </p>
        <p className="subtle text-xs">
          No artist on this wallet — you&apos;re here as audience.
        </p>
      </>
    );
  }

  if (isAuthed) {
    return <p>You manage more than one artist. Pick one to open.</p>;
  }

  if (address) {
    return <p>Sign the message in your wallet to finish connecting.</p>;
  }

  return (
    <p>
      Login with a Solana wallet to access and manage your{' '}
      <span className="highlight">synthetic artist</span>.
    </p>
  );
}

/** Same 4..4 form ConnectWalletButton uses, so the two agree on screen. */
function shorten(address: string | null): string {
  if (!address) return 'this wallet';
  return `${address.slice(0, 4)}..${address.slice(-4)}`;
}
