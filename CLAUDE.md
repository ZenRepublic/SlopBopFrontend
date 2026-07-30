# SlopBop Frontend

Mobile-first React web app (430px design target) — the public window into SlopBop. `OVERVIEW.md` has the mental model and the *why*; this file is the orientation map for working in the code.

## Current focus

**Group mixtape creation**, sold as **Mixtape Commissions**: a host rents a synthetic artist for a day with a group, everyone writes lyrics for a short song, the artist records them, and the songs release one-by-one on a shared mixtape page to react to and bop. The most-bopped song gets a music video on our socials.

Nav is **About · Roster · Mixtape · Account**. About (`/`) states the label's thesis and teases the offer; the Mixtape page (`/commission`) carries the pitch and ends in a `mailto:` inquiry — no payment or ordering flow yet. Pricing is deliberately off the page: inbound only, quoted over email. The offer's specifics — group size, the shape of a day, the prize — live in `features/commission/`, not here.

Sold as *Mixtape* in the nav, named *commission* in code and URL, because `features/mixtape/` is already the mixtape a group **receives** (`/mixtapes/:id`).

**Map (`/map`)** and **Apply (`/apply`)** are hidden from the nav but fully routed — deferred, not removed. Their context is parked in `SIMULATION.md`; un-hiding either is an edit to `TABS` in `components/NavBar.tsx`.

## Stack

React 19 · TypeScript · Vite · Tailwind 3 · React Router v7 · `@solana/wallet-adapter-react` (Phantom / Solflare / MWA).

Env: `VITE_API_URL` (backend base, defaults `http://localhost:5000`), `VITE_SOL_NETWORK`, `VITE_HELIUS_API_KEY` (unset — nothing makes an RPC call yet; `RPC_CONFIG` in `config/network.ts` fails loudly the day something does), and `VITE_DEV_WALLET_KEY` (`config/devWallet.ts`) — a dev-only keypair that signs in as an artist with no wallet popup. Every read of that key sits behind `import.meta.env.DEV` so it can't reach `dist/`; if you edit that file, re-verify by building with the var set and grepping `dist/` for the value.

## Code layout

- **`src/services/<service>/`** — one folder per backend, one file per resource, plus a same-named barrel. **The types here are the API contract** — keep them honest; the rest of the app points at them rather than restating shapes.
- **`src/hooks/`** — hook-per-resource. Reads build on `useResource<T>(fetcher, key, { onError?, pollMs?, cache? })`, which owns the stale-response guard, polling and `error`. `cache: true` caches at module scope and dedupes the in-flight request for session-static data — don't hand-roll that in a hook. Wallet-gated mutations are command-shaped: a submit hook per action.
- **`src/features/<feature>/`** — one folder per route: the page plus its components, co-located.
- **`src/context/`** — true app-wide singletons only: `SimContext`, `MusicPlayerContext` (one persistent audio element), `ToastContext`, `AuthContext`.
- **`src/components/`** — shared UI richer than a primitive: app-shell chrome, and blocks assembled from primitives. When two features need the same block it lives here, so no feature reaches into another's folder.
- **`src/primitives/`** — presentation-only, no domain shape. If it encodes a product concept or is assembled from other pieces, it's a `components/` block.

## Wallet auth

An artist belongs to a wallet (`owner_wallet`). `useWalletAuth` runs challenge → sign → verify for a 7-day JWT, `AuthProvider` holds it app-wide, `apiFetch` attaches it to every request. The token is stored **keyed by wallet address** and dropped when the adapter switches keys or disconnects — a stale token answers confidently for the wrong owner.

**Ownership is the server's answer.** Gate owner UI on `is_owner` from the artist's own fetch, never by comparing `publicKey` to `owner_wallet`. It's a rendering hint: forging it only draws buttons. Nothing consumes it yet — there are no owner-gated writes, so an owner action is a plain authenticated request, not another signature.

**Account** is a `TABS` entry with a `path` of `null`, because its destination isn't a constant: signed in with one artist it navigates to `/artists/:id`, anything else opens `AccountSheet`. There is no `/me` page — an owner sees the same URL as everyone else, with more on it.

## Styling — two systems by design

1. **Tailwind inline in TSX** — the default. Layout, spacing, one-off structure, simple states.
2. **`src/styles/`** — animations, complex or stateful selectors, and reusable components with real visual identity. `theme.css` holds the tokens (swap ~10 palette values to retheme the app); `components/*.css` is one file per component, `@import`ed by `index.css`. Use the tokens, never raw values.

Reach for Tailwind first. **Never co-locate `.css` next to a component** — it lives in `styles/components/`, so styling has exactly one home.

## Docs

- `OVERVIEW.md` — the mental model. **Read it first.**
- `SIMULATION.md` — the deferred sim + application layer. Skip it unless that work is back on.
- `src/styles/THEME.md` — what each colour is allowed to mean. Read before spending one.
- `../SlopBopSimulator/_DOCS/_INFRA/` — cross-repo contract (backend API, Mongo shapes). Read before any change that touches the backend's shape.

**No per-feature doc files, and no file inventories in this one** — the code and the service types are the detail, and they don't desync. (`src/features/map/_CONTEXT.md` and `_TERRAIN_OPEN_QUESTION.md` are the exception, and only while the sim's code is frozen.)
