# SlopBop Frontend — Overview

A mobile-first React SPA (430px design target) that serves as the public-facing window into SlopBop.

This document covers the conceptual architecture and the decisions behind it. For the code-level orientation map (folder layout, styling system) see `CLAUDE.md`; the technical detail — routes, hooks, components, API surface — is the code itself and the service types in `src/services/`, which don't desync from it. The deferred simulation layer has its own doc: `SIMULATION.md`.

---

## What This App Is For

SlopBop is an **agentic music label**: a cast of synthetic artists release songs, and the audience judges them. The thesis the label is betting on — and the line the About page opens with — is that AI music only *bops* when there's an actual artist behind it, with a personality, a voice and a taste of its own. The audience's bops are what settle that bet, which is why judging is a first-class act and not a feature.

Judging is **one-sided on purpose**: you can bop a song, and that's the whole mechanic. There is no counter-vote, because *slop is the default state of every song* — the joke the label is named for. A bop is the only thing that lifts one out of it, so the count is both the like and the ranking, and the copy is an action ("bop it"), never a question ("slop or bop?"). The two-sided version came first and was dropped: ratios let a song with one bop out-rank a loved one, and a room full of people could tank each other's songs into a uniform 20%.

The commercial breakout is **group mixtape creation**, sold as **Mixtape Commissions**. A host rents one of the synthetic artists for a private activity with a group: everyone writes the lyrics for one short (~30s) song, the artist records them, and the finished songs release one-by-one on a shared **mixtape page** for the group to listen, react to, and bop. The most-bopped song earns a music video posted to our socials.

The public app is trimmed to point at this. The NavBar is **About · Roster · Commission**. Two earlier surfaces — the live simulation (`/map`) and the audition funnel (`/apply`) — are **hidden from the nav but still fully routed and working**, deferred rather than removed. See `SIMULATION.md`.

The specifics of the offer — group size, how a day runs, what the prize is, what a buyer needs on the day — are **owned by the Commission page and its FAQ**, not restated here. `src/features/commission/` is the source of truth for all of it; prose in a doc only drifts out of sync with it.

---

## Mental Model

The app holds two data layers and keeps them deliberately separate.

**Static layer** — who the artists are. Profiles, bios, discographies, cover art, released music. Permanent, not tied to any simulation. It lives in the `artists`, `collections`, and `songs` MongoDB collections and is fetched directly. **It is the bulk of the app and the entire public experience today.**

**Live layer** — what the artists are doing today. Simulation-scoped, ephemeral, and entirely contained within `/map`. Deferred; documented in `SIMULATION.md`.

| UI surface | Data layer | Entry point |
|---|---|---|
| About (`/`) | Static | Landing page |
| Roster (`/roster`) | Static | NavBar |
| Artist Profile (`/artists/:id`) | Static | Roster card, About's featured card |
| Commission (`/commission`) | Static + write | NavBar |
| World Map (`/map`) | Live (sim) | *hidden — see `SIMULATION.md`* |

A user lands on About, browses the roster, and listens to artists' music — all static, no simulation involved. The static surfaces never read the sim, and nothing outside `/map` mounts `SimProvider` or calls `useSim()`. **That containment is load-bearing: it's why the rest of the app is cheap to reason about, and it should survive the sim coming back.**

---

## The Commission Funnel

Three surfaces carry one argument, in order, and they're written to hand off to each other:

1. **About (`/`)** — states the label's thesis, shows a featured artist, and *teases* the commission. The teaser deliberately withholds the mechanic; if it explained the whole product there'd be no reason to tap through.
2. **Commission (`/commission`)** — the pitch: the offer, a real playable example mixtape, how a day runs (`DayBreakdown`), the prize (`PrizeVideo`), and the FAQ. The FAQ is the objection layer and sits *above* the ask on purpose, so nothing unresolved is still in the reader's head when the form arrives.
3. **`MixtapeOrderForm`** — the ask. Choosing an artist and making the ask are one act, so they're one component: the carousel's selection feeds straight into what gets sent.

**The ask is an email today.** `ContactForm` opens a `mailto:` to `slopboptv@gmail.com`. There is no payment or ordering flow. When one arrives — Stripe, a booking calendar — only the piece below the carousel changes; the framing, the selection and the section's own background stay, and `CommissionPage` never learns about it. Pricing is deliberately off the page: inbound only, quoted over email.

**Every mixtape is currently public**, which is what the FAQ says out loud. There is no private or unlisted mode, and no authentication to build one on. The known cheap path is unlisted-by-default (collection IDs are unguessable Mongo ObjectIds, so simply not listing a mixtape is most of the work) — but that buys *unlisted*, not *private*, and copy shouldn't promise otherwise.

---

## Music Player

Global playback state lives in `MusicPlayerContext` — a single persistent `HTMLAudioElement`, not recreated per track. Songs can be played from the artist profile, any collection page, the Commission page's example mixtape, or directly from a Roster card (which surfaces each artist's top-rated track as a one-tap shortcut). The MiniPlayer (sticky bottom bar) and full MusicPlayer overlay both read from this shared context.

Playback is a pure static-layer concern with **no sim gating**. Visibility is instead gated on the **real wall clock**: `release_date` is a real-world UTC timestamp, and a song whose `release_date` is still in the future hasn't dropped yet — the song list renders the soonest such song as a "processing" countdown card that reveals it automatically when its moment arrives. Songs already past their `release_date` (or with none) are always visible. `release_date` doubles as the catalogue sort key.

This is the same mechanic a commissioned mixtape's staggered release runs on. It is **not** the sim's `sim_time` drip-feed — two different clocks, and conflating them is a real bug waiting to happen.

---

## Images & Media Loading

Cover art, artist photos, and cover images are the heaviest thing the app loads. They live on **Arweave** (a decentralized, permanent store) and are served through the **`turbo-gateway.com`** gateway. Two facts drive the whole strategy: we **can't set response headers** on them (no `Cache-Control`, no server-side resize — it's not our server), and Arweave is **immutable and content-addressed** — a given URL's bytes can *never* change.

The download size itself is fixed at **upload time**, not here. The upload pipeline saves images as 1024×1024 WebP (not 2048 PNG), which is the only place bytes actually get smaller. **The frontend cannot shrink a download** — a browser must fetch the whole file before it can show it. So the frontend solves the two things it *can*: how the wait feels, and never waiting twice.

**Perceived speed — the `Img` primitive (`src/primitives/Img.tsx`).** Every remote image renders through `Img`, not a raw `<img>`. It decodes off-thread (`decoding="async"`) and fades the whole image in at once over a shimmer placeholder — killing the "image reveals slowly from the top" effect on slow connections. It also lazy-loads (offscreen grid/list images don't fetch until scrolled to) and reveals correctly for already-cached images. Styling lives in `src/styles/components/image.css`. It splits classes: `className` sizes the frame (aspect/rounding), `imgClassName` handles object-fit. This is *perceived* speed only — it does not reduce bytes. (It accepts an optional `placeholderSrc` for a true blurred low-res preview, unused today.)

**Never waiting twice — the service worker (`vite.config.ts`, via `vite-plugin-pwa`).** A generated service worker intercepts every `turbo-gateway.com` request and serves it **CacheFirst** from the browser's Cache API. Because Arweave content is immutable, "cache forever, serve from cache" is completely safe — there is no staleness risk, ever — which is exactly why this is worth doing here and would be dangerous against a mutable server. First load hits the network; every load after is instant and offline-capable. This is the decentralized-storage equivalent of the `Cache-Control` header we can't set. It's off during `vite dev` (so it never serves stale assets while developing) and auto-updates on deploy.

**If media storage ever changes**, the only coupling is the `IMAGE_HOST` regex at the top of `vite.config.ts` — point it at the new gateway/host and nothing else changes. The `Img` component and every call site stay identical, because the service worker intercepts at the network layer, below React.

---

## The three collection types

A **collection** is the generic container for an artist's songs, and `type`
discriminates three of them. They share one shape and one detail read
(`fetchCollection`); what separates them is *how the songs get there*, and that
difference drives every surface decision below.

| type | songs come from | window | lifecycle | surface |
|---|---|---|---|---|
| `album` | the artist — authored | none | permanent | `/albums/:id`, listed in Discography |
| `mixtape` | a commissioning group | start → deadline, batch release | permanent | `/mixtapes/:id`, reached by its own link |
| `jam` | anyone, first-come | none, capacity only | **deleted when the artist picks the winner** | `/jams/:id`, the LIVE card on the profile |

Two consequences worth holding onto:

- **Only `album` appears in the Discography.** A jam is a live session, not a
  release; a commissioned mixtape is a group's artifact from their own day, and
  listing it would file someone's birthday party under the label's catalogue.
- **Only the crowdsourced two carry `request_status`.** An album returns none, so
  the submission UI has nothing to gate on and simply never renders.

A jam has no lifecycle flag — its *existence* is the live state, which is why
"does this artist have a jam" (`useLiveJam`) is a filtered list read.

---

## Routing

```
/                  AboutPage       — label thesis + commission teaser              [nav]
/about             AboutPage       — alias of /
/roster            RosterPage      — artist directory + top-rated song per artist  [nav]
/commission        CommissionPage  — commission an artist: offer + inquiry form    [nav]
/artists/:id       ArtistProfile   — static profile + discography
/albums/:id        AlbumPage       — authored album: plain tracklist
/mixtapes/:id      MixtapePage     — commissioned mixtape: tracklist + windowed submissions
/jams/:id          JamPage         — live jam: tracklist + capacity-bound submissions
/map               MapPage         — self-contained live simulation, world map     (hidden)
/apply             ApplicationForm — audition form to join a future season         (hidden)
```

`[nav]` marks the three NavBar tabs; `(hidden)` routes still work if visited directly but aren't linked — they're deferred, not removed (`SIMULATION.md`). Every visible route is purely static (or, for `/commission`, write-only) and never mounts `SimProvider` or reads `useSim()`. A `ScrollToTop` mounted in `main.tsx` resets the scroll container (the `<html>` element) on every route change.

---

## Key Architectural Decisions

**Static artist data fetched per page.** Profile and collection pages fetch their own data independently. There is no global artist cache — each route is self-contained.

**Session-static data cached at module scope, once.** `useResource`'s `cache: true` owns module-scope caching and in-flight dedup for data that can't change during a session (form config, and the sim's world map / item catalogue). Don't hand-roll caching in a hook alongside it.

**Media is cached client-side, not server-side.** Images come from Arweave via `turbo-gateway.com`, whose headers we don't control — but its content is immutable, so a CacheFirst service worker caches it forever, safely. The `Img` primitive handles perceived speed on top. See *Images & Media Loading*.

**Styling is a token-driven hybrid.** Tailwind utilities for the everyday (layout, spacing, one-offs); central CSS under `src/styles/` for animations and reusable components with real visual identity, all reading the same design tokens in `theme.css` so a retheme is a palette swap. The operational "which do I use when" rule lives in `CLAUDE.md`, and the intent behind the palette in `src/styles/THEME.md`. The decision here is that both systems exist on purpose and share one token source — they are not two competing systems.

**Deferred, not deleted.** The sim and the application funnel stay routed and working while hidden from the nav. The cost is carrying code no user reaches; the reason is that they're the roadmap, not abandoned work, and un-hiding is a NavBar edit rather than a rebuild.
