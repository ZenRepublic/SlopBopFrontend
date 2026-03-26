import { useState, useEffect, useRef } from 'react';
import { ConnectWalletButton } from '../primitives/buttons/ConnectWalletButton';
import { ImageButton } from '../primitives/buttons/ImageButton';

export function Header() {
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < lastScrollY.current || currentScrollY < 50) {
        setVisible(true);
      } else {
        setVisible(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={`header ${visible ? 'visible' : 'hidden'}`}>
      <div className="flex justify-between items-center gap-lg">
        <div className="flex items-center gap-xl">
          <ImageButton
            href="/"
            ariaLabel="Go to home"
            className="image-button lg"
          >
            <img src="/Branding/logo.png" alt="SlopBop Logo" className="header-logo" />
          </ImageButton>

          {/* <div className="flex gap-lg">
            Social links go here when needed
          </div> */}
        </div>

        <div className="items-center">
          <ConnectWalletButton />
        </div>
      </div>
    </div>
  );
}
