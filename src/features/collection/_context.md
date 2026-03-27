# CollectionPage — Context & Flow

## What it is

An interactive collection view (album/EP/single) for a SlopBop artist. Doubles as a **live recording studio** when an admin activates recording mode.

## Route

`/collections/:id` — `id` param maps to a collection document in the backend.

## Data Flow

```
useCollection(id)  → collection metadata + songs[]
useArtist(id)      → artist nickname/profile (derived from collection.artistId)
useAdmin()         → checks connected Solana wallet against admin list
```

All three load in parallel on mount. Page shows a spinner until both `collectionLoading` and `artistLoading` resolve.

## Layout (top → bottom)

1. **Live Recording Banner** — red bar with pulsing dot, only visible when `collection.isRecording === true`
2. **Cover Art** — full-width square image, falls back to `/Images/default_song_cover.png`
3. **Metadata** — title, collection type, linked artist name, formatted creation date
4. **Tracklist** — numbered song rows inside a card. Each row is a button that calls `play()` from `MusicPlayerContext`, passing the song data (audio URL, lyrics, stats, cover)
5. **Song Request Form** — only rendered during recording mode. Textarea (max 50 chars) + CREATE button. Requires wallet connection. Calls `useGenerateSong().generate(artistId, theme, collectionId)` → backend generates a song. Shows toast on success/failure and clears input.
6. **Admin Controls** — only rendered when `isAdmin === true`. Single button toggles recording mode on/off via `useRecordingMode().toggleRecording()`, then refetches collection data.

## Key Interactions

### Playing a song
User taps a track row → `play()` pushes a `Track` object into `MusicPlayerContext` → global player starts playback.

### Live Recording Mode (admin)
1. Admin connects Solana wallet → `useAdmin()` verifies against backend → shows toggle button
2. Admin clicks **START RECORDING** → `toggleRecording(collectionId, true)` signs a message with the wallet for auth, then hits the backend → `refetch()` reloads collection with `isRecording: true`
3. Banner appears, song request form appears for all connected users
4. Admin clicks **STOP RECORDING** → same flow in reverse

### Generating a Song (during recording)
1. Any connected wallet user types a theme (up to 50 chars)
2. Clicks **CREATE** → `generate(artistId, theme, collectionId)` signs wallet + sends to backend
3. Backend generates a song asynchronously
4. Toast confirms submission, input clears
5. No polling or auto-refresh — the new song is written to the database by the backend when ready. User must manually refresh the page to see it in the tracklist.

## Auth Model

- **Wallet verification**: both `useRecordingMode` and `useGenerateSong` use `useWalletVerification()` to sign a message before API calls — proves wallet ownership server-side
- **Admin check**: `useAdmin()` sends the connected wallet's public key to the backend; backend returns whether it's an admin wallet
- **Song creation**: requires wallet connection (`connected` flag) but not necessarily admin status — any connected user can request during recording mode
