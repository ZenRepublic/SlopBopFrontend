# SlopBop Frontend

Mobile-first React web app (430px design target) — the public window into SlopBop. The conceptual architecture and the *why* live in `OVERVIEW.md`; this file is the orientation map for working in the code.

## Current focus

The product has narrowed to its breakout feature: **group mixtape creation**, sold as **Mixtape Commissions**. A host rents one of our synthetic artists for a private activity with a group; everyone writes lyrics for a short song, the artist records them, and the songs release one-by-one on a shared mixtape page for the group to listen, react, and vote on. The top-voted song gets a music video posted to our socials.

The nav is **About · Roster · Commission**. The About page (`/`) states the label's thesis and teases the offer; the **Commission page (`/commission`, `features/commission/`, `CommissionPage`)** carries the pitch and ends with an email inquiry (`ContactForm` → a `mailto:` to `slopboptv@gmail.com`; no payment or ordering flow yet).

**The offer's specifics live in the code, not here.** Group size, how a day runs, the occasions it fits, the prize, what a buyer needs on the day — all of it is owned by `features/commission/` (`DayBreakdown`, `commission-faq-data.tsx`). Restating any of it in a doc just gives it somewhere to go stale. Pricing is deliberately off the page: inbound only, quoted over email.

Two earlier surfaces are **hidden from the NavBar but still fully routed and functional** — deferred, not removed:

- **Simulation / Map (`/map`)** — the live "artist lives a day" loop.
- **Application (`/apply`)** — the audition funnel to become a synthetic artist.

Both are documented in `SIMULATION.md`, which is parked context — read it when they come back, not before. Un-hiding either is an edit to `TABS` in `components/NavBar.tsx`.

## Stack

React 19 · TypeScript · Vite · Tailwind 3 · React Router v7 · `@solana/wallet-adapter-react` (Phantom / Solflare / MWA) for wallet-gated mutations.

Env: `VITE_API_URL` (backend base, defaults `http://localhost:5000`), `VITE_SOL_NETWORK` (devnet / mainnet).

## Code layout

- **`src/services/<service>/`** — one folder per backend, one file per resource, with a same-named barrel re-exporting it. Today: `services/slopbop/` (`client`, `artists`, `collections`, `songs`, `sim`, `application`, `admin`, `verification`). **The types here are the API contract** — keep them honest; the rest of the app points at them rather than restating shapes.
- **`src/hooks/`** — hook-per-resource. Read hooks build on the generic `useResource<T>(fetcher, key, { onError?, pollMs?, cache? })`, which owns the stale-response guard, optional polling, and an `error` value. Pass `cache: true` for data that's static for a session (world map, items, form config) — it caches at module scope and dedupes the in-flight request, so don't hand-roll module-level caching in a hook. Wallet-gated mutations follow a command-shaped pattern (`useWalletAuth` + a submit hook).
- **`src/features/<feature>/`** — one folder per route/feature: the page plus its components, co-located.
- **`src/context/`** — true app-wide singletons only: `SimContext` (the live-sim heartbeat, polled while live), `MusicPlayerContext` (one persistent audio element), `ToastContext`.
- **`src/components/`** — shared UI used across features but not itself a page, and richer than a primitive: app-shell chrome (`NavBar`, the `MusicPlayer` / `MiniPlayer` pair) and cross-feature blocks assembled from primitives (`songlist/` — `SongList` plus its row parts `SingleCard` / `ProcessingCard` / `ratingEmoji`; `songwriter/` — the `SongWriter` lyric instrument plus the `lyricLines` page model it writes on). When two features need the same block it lives here, so no feature reaches into another's folder.
- **`src/primitives/`** — low-level, presentation-only UI with no domain shape: form controls, `BottomSheet`, `Modal`, `Img`, `TagPills`. If it encodes a product concept or is assembled from other pieces, it's a `components/` block, not a primitive.

## Styling — hybrid, two systems by design

1. **Tailwind utility classes inline in TSX** — the default. Layout, spacing, one-off structure, simple states. No separate file.
2. **Central CSS under `src/styles/`** — for what Tailwind shouldn't do: animations, complex/stateful selectors, and reusable components with real visual identity.
   - `theme.css` — design tokens (palette → semantic roles → spacing / radius / z-index / type). The single source of truth; both Tailwind and the component CSS read these. Retheme the whole app by swapping the ~10 palette values.
   - `components/*.css` — one file per component (`stat-bar`, `cards`, `bottom-sheet`, `music-player`…), each `@import`ed by `index.css`. Use the tokens, never raw values.
   - `index.css` — entry point: imports the design system, then Tailwind, then global reset + animated background.

**Rule of thumb:** reach for Tailwind first; drop to a `styles/components/*.css` file when the styling is reusable, animated, or too complex to read inline. **Do not co-locate `.css` next to a component** — it lives in `styles/components/` and loads through `index.css`, so styling has exactly one home.

## Docs

- `OVERVIEW.md` — the mental model and the decisions behind it. **Read it first.**
- `SIMULATION.md` — the deferred sim + application layer. Parked context; skip it unless that work is back on.
- `src/styles/THEME.md` — what the palette *means* (which colour is allowed to do what). Read before spending a colour.
- Cross-repo contract (backend API, Mongo shapes, the other two repos): `../SlopBopSimulator/_DOCS/_INFRA/` — read before any change that touches the backend's shape.
- **No per-feature doc files.** The code plus the service types are the detail; they don't desync. Don't reintroduce per-feature markdown — it rots. (`src/features/map/_CONTEXT.md` and `_TERRAIN_OPEN_QUESTION.md` are the one exception, and only because the sim's code is frozen while it's deferred — they rot like anything else the moment it isn't.)
