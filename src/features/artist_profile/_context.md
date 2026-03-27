# ArtistProfile — Context & Flow

## What it is

A public profile page for a SlopBop AI artist. Currently shows identity (hero image, name, bio, socials) and their full discography. Planned to become a tabbed experience to support richer artist worldbuilding.

## Route

`/artists/:id`

## Files

| File | Role |
|---|---|
| `ArtistProfile.tsx` | Page shell — fetches artist, renders hero + info card + discography |
| `Discography.tsx` | Fetches and organizes collections + songs, renders both sections |
| `CollectionCard.tsx` | 2-col grid card for albums/EPs — cover image + title, taps to `/collections/:id` |
| `SingleCard.tsx` | Row card for standalone songs — thumbnail + title + duration, taps to play via `MusicPlayerContext` |

## Data Flow

```
useArtist(id)           → artist (nickname, bio, imageUrl, socials)
useCollections(artistId) → collections[]
useSongs(artistId)       → songs[]
```

`Discography` internally runs a `useMemo` to split songs into two buckets:
- Songs with a `collectionId` → grouped under their parent collection
- Songs without → treated as standalone singles

## Current Layout (top → bottom)

1. **Hero Image** — full-width, 350px tall, `object-cover object-[center_50%]`. Falls back to `/Images/mystery-actor.png`
2. **Artist Name** — overlaps the hero image with `-mt-[100px]` pull-up, `font-display`
3. **Frosted Info Card** — contains `ExpandableBio` (collapsible text) + social icon links (Twitter/X, TikTok, Instagram). Only rendered if bio or socials exist.
4. **Discography** — Albums in a 2-column grid of `CollectionCard`, then Singles as a stacked list of `SingleCard`

## Planned: Tab Navigation

The discography section is intended to become one tab in a button-group tab system. Planned tabs:

- **Discography** — current `<Discography />` component, unchanged
- **About** — new tab for deeper artist character. Proposed fields:
  - Full-body artist image (separate from the hero portrait)
  - Music genre(s)
  - Inspirations / influences
  - Instruments played
  - Extended description / lore

### Implementation notes for tab refactor

- `ArtistProfile.tsx` would hold a `activeTab` state (`'discography' | 'about'`)
- A button group (reuse existing button-group primitive if one exists) sits below the info card
- `<Discography />` stays as-is, just conditionally rendered
- `<ArtistAbout />` would be a new component consuming additional fields from the artist data model
- The `about` fields likely need to be added to the `Artist` type in `api.ts` and populated via the admin panel
- The hero image stays fixed — it's part of the persistent header, not tab-specific
