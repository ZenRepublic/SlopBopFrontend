# Music Player Feature

## Overview
Full-screen music player with a collapsed mini-player bar. All playback state lives in `MusicPlayerContext`.

## Files

| File | Role |
|---|---|
| `MusicPlayer.tsx` | Expanded full-screen view: cover art, title, play/pause, ±15s skip, seek slider, BopMeter, lyrics. Imports `music-player.css` for slider styles. |
| `MiniPlayer.tsx` | Collapsed bottom bar (yellow). Shows cover, title, play/pause, expand, close. Visible when a track is loaded but not expanded. |
| `BopMeter.tsx` | Voting widget between slider and lyrics. Shows bop %, total votes, SLOP/BOP buttons. Uses `localStorage` (`slopbop_votes` key) to prevent double-voting. Calls `PATCH /msi/songs/:id/vote`. Imports `bop-meter.css`. |
| `music-player.css` | Seek slider styling (custom range input thumb/track). |
| `bop-meter.css` | Animated sine-wave background for the voting strip. |

## State
`MusicPlayerContext` (`src/context/MusicPlayerContext.tsx`) manages:
- `track` (id, title, coverUrl, audioUrl, duration, lyrics, stats)
- `playing`, `currentTime`, `duration`, `expanded`
- Actions: `play`, `togglePlay`, `seek`, `skip`, `expand`, `collapse`, `close`

Uses a persistent `HTMLAudioElement` ref — not recreated per track.

## Voting Flow
1. Song `stats` (`{ bops, slops, totalVotes }`) come from the backend on the Song document
2. BopMeter reads stats from `track.stats` and checks localStorage for prior vote
3. On vote → `PATCH /msi/songs/:id/vote` → backend returns updated stats → UI updates + localStorage marked
4. No auth — one vote per browser per song via localStorage
