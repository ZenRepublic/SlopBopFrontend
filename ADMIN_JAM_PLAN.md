# Plan — Admin login & mixtape creation

**This is a build plan, not a doc. Delete it when the work ships.** The repo's
rule is that per-feature markdown rots (see `CLAUDE.md`); this file exists to get
one feature built and should leave with it.

## The goal, narrowly

One logged-in action: **create a mixtape on an artist** — title, cover, max
submissions. Nothing else.

Explicitly **not** in scope: resolving a mixtape (picking the winning song,
deleting the losers), editing or deleting a mixtape after creation, any admin
dashboard, any account system. Resolution stays a manual database operation for
now, which is fine — it happens once per session and only Thomas does it.

## The auth decision

SlopBop is a **label with a hard cap** (~16 artists), not an open platform. Today
there is exactly one operator, so:

- **Now:** the gate is *admin*. `useAdmin` already exists and is currently unused —
  this feature is its first consumer. No user model, no accounts, no signup.
- **Later:** when a second person operates an artist, add `owner_wallet` to the
  artist document and change the gate from "is admin" to "is admin **or** owns
  this artist." That is a one-line change at each call site because both answers
  arrive the same way: POST a wallet, get a boolean.

Building accounts now would be building for a second operator who does not exist
yet and, per Thomas, will not for a while. The seam above is cheap enough that
waiting costs nothing.

## The one thing that must not be got wrong

`useAdmin` is **not security**. It checks whether a *connected* wallet address is
an admin — a client-side read, and anyone can connect any address they like. It
decides whether the UI is *shown*, nothing more.

The actual authorization has to happen server-side on the create request, and the
mechanism already exists: `useWalletVerification` in `hooks/useWalletAuth.ts`
produces a `VerificationData` (challenge id + signed message + address), and the
backend verifies the signature proves ownership of that wallet *and* that the
wallet is an admin. The signature is what makes the claim real.

So, two distinct gates, and both are needed:

| Gate | Mechanism | Purpose |
|---|---|---|
| UI visibility | `useAdmin()` | Don't show the button to strangers |
| Authorization | signed `VerificationData` on the POST, verified server-side | Actually stop them |

This mirrors how wallet-gated mutations already work in this app; nothing new is
being invented.

## Backend — needed before the frontend can land

Cross-repo change. Read `../SlopBopSimulator/_DOCS/_INFRA/` first, and note that
`collections` is a backend-owned collection per `MONGO_SCHEMA.md`.

**`POST /slopbop/collections`** — create a mixtape.

```
body: {
  verification: VerificationData,   // the existing challenge/signature shape
  artist_id: string,
  type: 'mixtape',
  title: string,
  cover_url: string,
  max_tracks: number,
}
```

Must, server-side:

1. Verify the signature against the stored challenge, then confirm the wallet is
   an admin. Reject with 401/403 otherwise.
2. **Reject if the artist already has a mixtape** (409). This is the "one open
   mixtape at a time" rule, and it belongs on the server — the frontend hides the
   button, but the rule can't live only there.
3. Validate `max_tracks` within sane bounds and `title` length, returning
   field-keyed errors on a 400 so the form can map them onto inputs (the pattern
   `useSubmitSongRequest` already expects).

## Frontend steps

Follows the conventions in `CLAUDE.md` — service types are the contract, hooks
are per-resource, mutations are command-shaped.

1. **`services/slopbop/collections.ts`** — add `CreateMixtapePayload` and
   `createMixtape(payload)`. Types here are the API contract; keep them matching
   the endpoint above.

2. **`hooks/useCreateMixtape.ts`** — command-shaped mutation hook, modelled on
   `useSubmitSongRequest`: `{ create, submitting, fieldErrors }`. It calls
   `useWalletVerification().verify()` to get the signature, then POSTs. The
   signature prompt is part of submitting, not of opening the form — don't make
   the user sign just to see the fields.

3. **`features/artist_profile/CreateMixtapeForm.tsx`** — title, cover URL, max
   submissions. Use the existing `primitives/form` controls (`TextField`) and put
   it in a `Modal` or `BottomSheet` from `primitives/`, both of which exist.

4. **`features/artist_profile/ArtistProfile.tsx`** — where it hangs. The artist
   can only have one mixtape, so the create affordance goes in **the same slot
   `LiveMixtapeCard` occupies**:

   ```
   mixtape        → <LiveMixtapeCard />
   !mixtape && isAdmin → "Start a mixtape" button
   !mixtape && !isAdmin → nothing
   ```

   That gives the whole feature a home without a new route, a dashboard, or a nav
   entry, and it reads correctly: the slot is "what this artist has going on."

5. On success, refetch so `useLiveMixtape` picks up the new mixtape and the card
   replaces the button. `useCollections` is built on `useResource` — check its
   cache behaviour here, since a stale list would leave the button showing after
   a successful create.

## Cover images — paste a URL, don't build upload

There is **no upload infrastructure in this repo**. Existing covers are Arweave
URLs served from `turbo-gateway.com`, uploaded out-of-band. Building a file
picker, upload endpoint, storage credentials, and progress UI would be several
times the size of this entire feature.

So the cover field is a **text input taking a URL**, previewed with `Img` so a
typo is obvious before submitting. Thomas uploads to Turbo the way he does now
and pastes the link. Revisit only if a second operator ever needs it.

## Open questions

- **Does the backend already have a create-collection endpoint?** Albums exist,
  so something creates them — if it's the simulator rather than the backend, or
  an unauthenticated internal route, that changes step 1 above. Check before
  building.
- **Bounds on `max_tracks`?** The UI should offer a sane range rather than a free
  number field. What's the real ceiling for a session?
- **Does creating a mixtape need to be undoable?** Thomas mentioned deleting a
  mixtape to start over (losing all songs). If a typo'd title is currently
  unfixable without database access, a delete may be worth folding in — it's
  small, and it's the difference between a mistake costing a click and costing a
  Mongo session.
