import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockScreen } from '../../../../primitives/LockScreen';
import { TextField } from '../../../../primitives/form';
import { useCreateJam } from '../../../../hooks/useCreateJam';
import { useToast } from '../../../../context/ToastContext';

interface Props {
  artistId: string;
  /** Close the studio. Called once the jam exists and we're leaving for it. */
  onDone: () => void;
}

// Long enough for a rallying line, short enough that the jam card stays a card —
// it's quoted there in full, with no truncation. The backend takes any string, so
// this is a presentation limit, not the contract.
const CTA_MAX = 80;

/**
 * What a jam is, and the one thing the owner gets to author about it. The copy
 * spells out the whole 7-day shape up front because the destructive half — the
 * also-rans being deleted — happens days later and can't be taken back.
 *
 * Creating a jam is the slow, unrepeatable step: the server renders cover art and
 * uploads it to Arweave before it answers, so it runs for seconds and two calls
 * make two jams. `LockScreen` covers the whole app while it's in flight, so
 * nothing here needs its own busy state — the form stays visible behind the lock
 * but is `inert`, meaning Create can't be pressed, tabbed to, or re-fired, and
 * the studio can't be dismissed out from under it.
 */
export default function JamCreator({ artistId, onDone }: Props) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { create, creating, error } = useCreateJam();
  const [cta, setCta] = useState('');

  // `create` resolves to null on failure and parks the reason in `error`, which
  // it clears at the start of every attempt — so this fires once per failure,
  // including two identical ones in a row.
  useEffect(() => {
    if (error) showToast(error);
  }, [error, showToast]);

  const handleCreate = async () => {
    const jam = await create(artistId, cta.trim() || undefined);
    if (!jam) return; // failed (toast above) or a suppressed double-fire
    onDone();
    navigate(`/jams/${jam.collection_id}`);
  };

  return (
    <>
      <div className="flex flex-col gap-md">
        <p className="text-sm text-muted leading-relaxed">
          Create a Jam and let your fans create songs for you. Once your jam
          starts, anyone will be able to submit their own lyrics, and songs will
          show up as they get created.
        </p>
        <p className="text-sm text-muted leading-relaxed">
          After a period of 6 days you will have 24 hours to select one song that
          survives the jam and becomes a Single — while the other submissions
          perish.
        </p>
      </div>

      {/* `help` renders as a parenthetical beside the label, so it stays one
          word — the rallying part is the placeholder's job. */}
      <TextField
        label="Call to action"
        value={cta}
        onChange={setCta}
        maxLength={CTA_MAX}
        placeholder="Let's go fam!"
        help="optional"
      />

      {/* `special`, like every other terminal form action in the app (the
          application form, the commission ask, the songwriter). */}
      <button type="button" onClick={handleCreate} className="special full-width">
        Create
      </button>

      {/* Portals to its own container on the body, so living inside the modal
          doesn't stop it freezing the modal. */}
      <LockScreen
        active={creating}
        title="Starting your jam…"
        detail="Painting the cover art and putting it on Arweave. This takes a few seconds — hang tight."
      />
    </>
  );
}
