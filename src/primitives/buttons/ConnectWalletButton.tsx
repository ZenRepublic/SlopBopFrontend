import { useState, useCallback, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { SolanaMobileWalletAdapterWalletName } from '@solana-mobile/wallet-standard-mobile';

export function ConnectWalletButton() {
  const {
    wallet,
    wallets,
    connected,
    connecting,
    connect,
    disconnect,
    select,
  } = useWallet();

  const { setVisible: setModalVisible } = useWalletModal();

  const [isHovered, setIsHovered] = useState(false);

  const defaultText = useMemo(() => {
    if (connecting) return 'Connecting...';
    if (!connected) return 'Connect';

    const pk = wallet?.adapter.publicKey?.toBase58() ?? '';
    return pk ? `${pk.slice(0, 4)}..${pk.slice(-4)}` : 'Connected';
  }, [connecting, connected, wallet?.adapter.publicKey]);

  // This is the only place where we decide what to show
  const displayedText = connected && isHovered ? 'Disconnect' : defaultText;

  const handleClick = useCallback(async () => {
    if (connected) {
      await disconnect();
      return;
    }

    if (wallet?.adapter.name === SolanaMobileWalletAdapterWalletName) {
      await connect();
      return;
    }

    const mwa = wallets.find(w => w.adapter.name === SolanaMobileWalletAdapterWalletName);
    if (mwa) {
      await select(mwa.adapter.name);
      return;
    }

    setModalVisible(true);
  }, [connected, disconnect, connect, wallet, wallets, select, setModalVisible]);

   const buttonVariant = connected && isHovered ? 'back' : connected ? 'primary' : 'secondary';
   const buttonClass = `${buttonVariant} ${connecting ? 'opacity-55 cursor-not-allowed' : ''}`;

  return (
    <button
      onClick={handleClick}
      disabled={connecting}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={buttonClass.trim()}
    >
      {displayedText}
    </button>
  );
}
