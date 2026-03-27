# SlopBop Frontend — App Context

## What It Is

SlopBop is a platform for AI-generated synthetic artists. The frontend is a mobile-first web app (430px design target) that serves as both a public artist showcase and an interactive live recording tool. Currently, **thomukas1** is the featured artist used to demonstrate the concept.

The experience is closest to AI Spotify: browse artists, listen to their collections, vote on songs, and during live events, request AI-generated songs in real time.

---

## Routes

| Route | Component | Description |
|---|---|---|
| `/` | `App` | Placeholder ("My Super Idol", coming soon) |
| `/artists/:id` | `ArtistProfile` | Artist profile + discography |
| `/collections/:id` | `CollectionPage` | Album/EP view + live recording mode |

---

## Tech Stack

**Frontend**
- React 19, TypeScript, Vite
- Tailwind CSS 3 (utility classes in TSX; CSS files only for animations)
- React Router v7
- `@solana/wallet-adapter-react` + `@solana-mobile/wallet-standard-mobile` for wallet connect (Phantom, Solflare, MWA on mobile)
- Helius RPC for Solana connection (devnet or mainnet via `VITE_SOL_NETWORK` env)

**Backend** (external, TypeScript, Heroku)
- MongoDB for all data (artists, collections, songs)
- Arweave for audio file storage — only URLs are stored in MongoDB
- REST API under `/msi/` prefix
- Base URL configured via `VITE_API_URL` env var (defaults to `http://localhost:5000`)

**Song Generation** (local machine, Python)
- FastAPI server running locally on Thomas's machine (5090 GPU)
- Exposed via ngrok tunnel — only the backend can call it, authenticated via secret API key
- Pipeline: ACE-Step + voice LoRA + processing → uploads audio to Arweave → returns URL + metadata to backend

---

## Data Model

```ts
Artist     { _id, nickname, bio?, imageUrl?, socials? }
Collection { _id, artistId, collectionType: 'Album'|'EP', title?, coverUrl?, isRecording?, createdAt? }
Song       { _id, artistId, collectionId?, title?, duration?, coverUrl?, audioUrl?, lyrics?, createdAt?, stats? }
SongStats  { bops, slops, totalVotes }
```

---

## Feature Breakdown

### Artist Profile (`/artists/:id`)

Fetches artist, collections, and songs in parallel. Layout:

1. Full-width hero image (350px tall, `object-cover`)
2. Artist name overlapping the hero (pull-up with `-mt-[100px]`)
3. Frosted info card — collapsible bio + social icon links (Twitter/X, TikTok, Instagram)
4. Discography — Albums/EPs in a 2-column `CollectionCard` grid, standalone singles as a stacked `SingleCard` list

Songs are split via `useMemo`: songs with a `collectionId` are grouped under their collection; the rest are singles.

Tapping a `CollectionCard` navigates to `/collections/:id`. Tapping a `SingleCard` calls `play()` on `MusicPlayerContext`.

### Collection Page (`/collections/:id`)

Loads collection metadata + songs + admin status in parallel. Layout:

1. **Live Recording Banner** — red bar with pulsing dot, only when `isRecording === true`
2. Full-width square cover art
3. Metadata — title, type, linked artist name, date
4. **Tracklist** — numbered rows, each taps to call `play()` on `MusicPlayerContext`
5. **Song Request Form** — visible only during recording mode; requires wallet connected; textarea (50 char max) + CREATE button; submits theme to generate a new song
6. **Admin Controls** — visible only to admin wallets; START/STOP RECORDING toggle

### Music Player

Global playback state in `MusicPlayerContext` — a persistent `HTMLAudioElement` ref, not recreated per track.

- **MiniPlayer** — sticky yellow bottom bar, visible when a track is loaded but player not expanded. Shows cover, title, play/pause, expand, close.
- **MusicPlayer** — full-screen view with cover art, title, play/pause, ±15s skip, seek slider, BopMeter, and lyrics.
- **BopMeter** — SLOP/BOP voting strip between the slider and lyrics. Reads `track.stats`, checks `localStorage` (`slopbop_votes` key) to prevent double-voting, calls `PATCH /msi/songs/:id/vote`.

---

## Auth Model

### Wallet Verification (challenge-response)
Used for any sensitive action (recording mode toggle, song generation). Flow:
1. `useWalletVerification()` calls backend to get a challenge message + `challengeId`
2. User's wallet signs the message
3. Signature + challenge data sent alongside the API request; backend verifies server-side

### Admin Check
`useAdmin()` sends the connected wallet's public key to `POST /msi/admin/check`. Backend returns `{ isAdmin: boolean }` based on an allowlist. Admin wallets see the recording controls.

### Song Generation Auth
Any wallet-connected user can submit a song request during recording mode (not admin-only). Still requires wallet verification to sign the request.

---

## API Surface (Frontend → Backend)

All calls go through `apiFetch()` in `src/services/api.ts` with base `VITE_API_URL`.

| Call | Method | Endpoint |
|---|---|---|
| Fetch artist | GET | `/msi/artist/:id` |
| Fetch collections | GET | `/msi/collections?artist_id=&type=` |
| Fetch collection + songs | GET | `/msi/collections/:id` |
| Fetch songs (standalone) | GET | `/msi/songs?artist_id=` |
| Vote on song | PATCH | `/msi/songs/:id/vote` |
| Generate song | POST | `/msi/song/generate` |
| Toggle recording mode | POST | `/msi/collections/recording-mode` |
| Admin check | POST | `/msi/admin/check` |

---

## Context Providers (App-level)

Wrapping order in `main.tsx`:

```
BrowserRouter
  WalletContextProvider    ← Solana wallet (Phantom, Solflare, MWA)
    ToastProvider          ← global toast notifications
      MusicPlayerProvider  ← global audio playback state
        Header
        Routes
        MiniPlayer
        MusicPlayer
```

---

## Key Files

| Path | Role |
|---|---|
| `src/main.tsx` | Bootstrap, providers, routing |
| `src/config/network.ts` | Solana network + Helius RPC config |
| `src/services/api.ts` | All backend calls + TypeScript types |
| `src/services/walletAuth.ts` | Challenge-response wallet verification |
| `src/context/MusicPlayerContext.tsx` | Global audio state |
| `src/context/ToastContext.tsx` | Global toast state |
| `src/hooks/useAdmin.ts` | Admin wallet check |
| `src/hooks/useWalletAuth.ts` | Wallet signature flow |
| `src/hooks/useRecordingMode.ts` | Toggle recording on a collection |
| `src/hooks/useGenerateSong.ts` | Submit song generation request |
| `src/features/artist_profile/` | Artist profile page + discography |
| `src/features/collection/` | Collection/album page + live mode |
| `src/features/music_player/` | MusicPlayer, MiniPlayer, BopMeter |
| `src/components/Header.tsx` | Global header |
