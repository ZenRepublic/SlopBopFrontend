import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AccountSheet } from './AccountSheet';

type Tab = {
  // The route this tab opens, or null for the one tab whose destination isn't a
  // constant: Account goes wherever the session says, so it's resolved on click.
  path: string | null;
  emoji: string;
  label: string;
};

const TABS: Tab[] = [
  { path: '/', emoji: '🎪', label: 'About' },
  { path: '/roster', emoji: '🎭', label: 'Roster' },
  { path: '/order', emoji: '💽', label: 'Mixtape' },
  { path: null, emoji: '👩🏻‍🎤', label: 'Account' },
  // Deferred features — routes still work, just hidden from the nav for now.
  // Restore by re-adding these entries when Map and Apply come back.
  // { path: '/map', emoji: '🗺️', label: 'Map' },
  // { path: '/apply', emoji: '🎙️', label: 'Apply' },
];

export function NavBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isAuthed, myArtists } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);

  // Channel-change static: themed noise bands pop in to cover the page (the CSS
  // for `.tv-switching` lives in transitions.css), swap the route ~230ms in
  // (while the bands fully cover the screen) so the cut is hidden, then clear
  // the class after the burst ends. Reduced-motion users skip it.
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const handleNav = useCallback((path: string) => {
    if (path === pathname) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      navigate(path);
      return;
    }

    const root = document.documentElement;
    timers.current.forEach(clearTimeout);
    // Restart the burst cleanly if one's still mid-flight.
    root.classList.remove('tv-switching');
    void root.offsetWidth; // force reflow so the animation re-triggers
    root.classList.add('tv-switching');

    timers.current = [
      window.setTimeout(() => navigate(path), 250),
      window.setTimeout(() => root.classList.remove('tv-switching'), 510),
    ];
  }, [pathname, navigate]);

  const goToArtist = useCallback(
    (artistId: string) => handleNav(`/artists/${artistId}`),
    [handleNav],
  );

  // Account's destination, resolved fresh each render. Signed in with exactly one
  // artist it's a shortcut to that artist's page — the same public page everyone
  // else sees, just with the owner's controls drawn on it. Every other answer
  // (not signed in, no artist, or several to choose between) is a question, and
  // null is how the tab says so: the sheet is what asks it.
  const soleArtist = isAuthed && myArtists.length === 1 ? myArtists[0] : null;
  const accountPath = soleArtist ? `/artists/${soleArtist.artist_id}` : null;

  const handleTab = (tab: Tab) => {
    const path = tab.path ?? accountPath;
    if (path) handleNav(path);
    else setAccountOpen(true);
  };

  // Account lights up on any artist you own, not on one fixed route.
  const isActive = (tab: Tab) =>
    tab.path === null
      ? myArtists.some(a => pathname === `/artists/${a.artist_id}`)
      : pathname === tab.path;

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-fixed h-[60px] bg-surface-2 border-t border-border">
        <div className="max-w-[430px] mx-auto h-full flex items-center justify-around">
          {TABS.map(tab => (
            <button
              key={tab.label}
              type="button"
              onClick={() => handleTab(tab)}
              // px-4, not the px-8 three tabs used to wear — four don't fit at 430px.
              className={`flex flex-col items-center gap-0.5 px-4 h-full justify-center transition-base ${
                isActive(tab) ? 'text-accent' : 'text-muted'
              }`}
            >
              <span className="text-xl leading-none">{tab.emoji}</span>
              <span className="text-[10px] font-medium uppercase tracking-wider">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <AccountSheet
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        onGoToArtist={goToArtist}
      />
    </>
  );
}
