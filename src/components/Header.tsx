import { useState, useEffect, useRef } from 'react';
import { ConnectWalletButton } from '../primitives/buttons/ConnectWalletButton';
import { ImageButton } from '../primitives/buttons/ImageButton';

const SCROLL_UP_THRESHOLD = 30;

export function Header() {
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollUpAccumulator = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const delta = lastScrollY.current - currentScrollY;

      if (currentScrollY < 50) {
        setVisible(true);
        scrollUpAccumulator.current = 0;
      } else if (currentScrollY >= maxScroll - 5) {
        scrollUpAccumulator.current = 0;
      } else if (delta > 0) {
        scrollUpAccumulator.current += delta;
        if (scrollUpAccumulator.current >= SCROLL_UP_THRESHOLD) {
          setVisible(true);
        }
      } else {
        scrollUpAccumulator.current = 0;
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
