import { Buffer } from 'buffer';
window.Buffer = Buffer;

import { StrictMode, ReactNode, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  Navigate,
  useLocation,
} from 'react-router-dom';

import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';

import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

import {
  registerMwa,
  createDefaultAuthorizationCache,
  createDefaultChainSelector,
  createDefaultWalletNotFoundHandler,
} from '@solana-mobile/wallet-standard-mobile';

// Desktop wallet adapters (optional enhancers)
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';

import ArtistProfile from './features/artist_profile/ArtistProfile';
import { NavBar } from './components/NavBar';
import AlbumPage from './features/album/AlbumPage';
import MixtapePage from './features/mixtape/MixtapePage';
import JamPage from './features/jam/JamPage';
import MapPage from './features/map/MapPage';
import AboutPage from './features/about/AboutPage';
import RosterPage from './features/roster/RosterPage';
import CommissionPage from './features/commission/CommissionPage';
import ApplicationForm from './features/apply/ApplicationForm';
import { SOLANA_CHAIN, HELIUS_RPC_URL } from './config/network';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { MusicPlayerProvider } from './context/MusicPlayerContext';
import MusicPlayer from './components/MusicPlayer';
import MiniPlayer from './components/MiniPlayer';

import './styles/index.css';
import '@solana/wallet-adapter-react-ui/styles.css';

/**
 * ---------------------------------------------------------
 * MWA + Wallet Standard registration
 * ---------------------------------------------------------
 * This MUST run once, before React renders.
 */
registerMwa({
  appIdentity: {
    name: 'Slop Bop',
    uri: window.location.origin,
    icon: '/Branding/logo-full.png', // must exist in /public
  },
  authorizationCache: createDefaultAuthorizationCache(),
  chains: [SOLANA_CHAIN],
  chainSelector: createDefaultChainSelector(),
  onWalletNotFound: createDefaultWalletNotFoundHandler(),
});

interface WalletContextProviderProps {
  children: ReactNode;
}

function WalletContextProvider({ children }: WalletContextProviderProps) {
  const endpoint = HELIUS_RPC_URL;

  /**
   * Desktop adapters only.
   * Wallet Standard + MWA wallets are injected automatically.
   */
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={true}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

/**
 * ---------------------------------------------------------
 * App bootstrap
 * ---------------------------------------------------------
 */

/**
 * Reset scroll to the top on every route change. The scroll container is the
 * <html> element (see index.css), so React Router leaves it wherever the last
 * page was — without this, navigating lands you mid-page.
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.documentElement.scrollTo({ top: 0, left: 0 });
  }, [pathname]);
  return null;
}

// Diagonal channel-change static bands. Count / colour / scattered pop-in delay
// are data-driven here so transitions.css stays generic; positions are % of the
// (rotated, oversized) overlay. `(i * 7) % 16` scatters the delays so the bands
// don't fill in top-to-bottom. Max delay ~150ms → they all overlap at full
// cover around 220–290ms, which is when the NavBar swaps the route.
const TV_BAND_COUNT = 12;
const TV_BAND_COLORS = ['var(--p-navy)', 'var(--p-lime)', 'var(--p-cobalt)'];
const TV_BANDS = Array.from({ length: TV_BAND_COUNT }, (_, i) => ({
  top: `calc(${i} * 100% / ${TV_BAND_COUNT})`,
  height: `calc(100% / ${TV_BAND_COUNT} + 1px)`,
  background: TV_BAND_COLORS[i % TV_BAND_COLORS.length],
  animationDelay: `${((i * 7) % 16) * 10}ms`,
}));

/**
 * Persistent app shell. The routed page renders in <Outlet />; the chrome
 * around it (nav, players) and ScrollToTop live here so they stay mounted
 * across navigations — the MusicPlayer's audio element in particular must not
 * remount. This is the layout route that wraps every page below.
 */
function RootLayout() {
  return (
    <>
      <ScrollToTop />
      <Outlet />
      <NavBar />
      <MiniPlayer />
      <MusicPlayer />
      {/* Channel-change static overlay — diagonal bands that pop in to cover
          the screen. Inert until the NavBar toggles `.tv-switching` on <html>
          during a page change (see transitions.css). */}
      <div className="tv-static" aria-hidden="true">
        {TV_BANDS.map((style, i) => (
          <span key={i} className="tv-band" style={style} />
        ))}
      </div>
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <AboutPage /> },
      { path: '/about', element: <AboutPage /> },
      { path: '/roster', element: <RosterPage /> },
      { path: '/order', element: <CommissionPage /> },
      // The offer used to live at /commission and the page is still named for
      // it. Kept as a redirect because this is a public marketing URL — anything
      // already shared or indexed should land on the offer, not on nothing.
      { path: '/commission', element: <Navigate to="/order" replace /> },
      { path: '/map', element: <MapPage /> },
      { path: '/apply', element: <ApplicationForm /> },
      { path: '/artists/:id', element: <ArtistProfile /> },
      { path: '/albums/:id', element: <AlbumPage /> },
      { path: '/mixtapes/:id', element: <MixtapePage /> },
      { path: '/jams/:id', element: <JamPage /> },
    ],
  },
]);

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container missing in index.html');
}

createRoot(container).render(
  <StrictMode>
    <WalletContextProvider>
      {/* Inside the wallet providers — the session is built from the adapter's
          connected key — and outside the router, so the nav and every page read
          the same one session. */}
      <AuthProvider>
        <ToastProvider>
          <MusicPlayerProvider>
            <RouterProvider router={router} />
          </MusicPlayerProvider>
        </ToastProvider>
      </AuthProvider>
    </WalletContextProvider>
  </StrictMode>
);
