import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../primitives/Modal';
import { LockScreen } from '../../../primitives/LockScreen';
import { TextField } from '../../../primitives/form';
import { useCreateJam } from '../../../hooks/useCreateJam';
import { useToast } from '../../../context/ToastContext';

interface Props {
  open: boolean;
  onClose: () => void;
  artistId: string;
}

// Which of the three things the artist is making. 'jam' is the only one with a
// second step today; the others exist as buttons so the menu reads as a menu and
// not as a single disguised action.
type View = 'choose' | 'jam';

// Long enough for a rallying line, short enough that the jam card stays a card —
// it's quoted there in full, with no truncation. The backend takes any string, so
// this is a presentation limit, not the contract.
const CTA_MAX = 80;

/**
 * The owner's create menu: pick a collection type, then fill in whatever that
 * type needs. Two views in one modal rather than two modals, because "what am I
 * making" and "make it" are one decision the artist can back out of halfway.
 *
 * Creating a jam is the slow, unrepeatable step — the server renders cover art
 * and uploads it to Arweave before it answers, so it runs for seconds and two
 * calls make two jams. `LockScreen` covers the whole app while it's in flight, so
 * nothing here needs its own busy state: the form stays visible behind the lock
 * but is `inert`, meaning the Create button can't be pressed, tabbed to, or
 * re-fired, and the modal can't be dismissed out from under it.
 */
export default function CreateModal({ open, onClose, artistId }: Props) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { create, creating, error } = useCreateJam();

  const [view, setView] = useState<View>('choose');
  const [cta, setCta] = useState('');

  // Reset on the way *in*, not on the way out: the box animates closed over
  // 250ms and still shows its content, so clearing at close would flash the menu
  // over the view the artist just left.
  useEffect(() => {
    if (!open) return;
    setView('choose');
    setCta('');
  }, [open]);

  // `create` resolves to null on failure and parks the reason in `error`, which
  // it clears at the start of every attempt — so this fires once per failure,
  // including two identical ones in a row.
  useEffect(() => {
    if (error) showToast(error);
  }, [error, showToast]);

  const handleCreate = async () => {
    const jam = await create(artistId, cta.trim() || undefined);
    if (!jam) return; // failed (toast above) or a suppressed double-fire
    onClose();
    navigate(`/jams/${jam.collection_id}`);
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title={view === 'jam' ? 'Jam Creator' : 'Create'}>
        <div className="flex flex-col gap-lg overflow-y-auto p-xl">
          {view === 'choose' ? (
            <ChooseView onPickJam={() => setView('jam')} />
          ) : (
            <JamView
              cta={cta}
              onCtaChange={setCta}
              onBack={() => setView('choose')}
              onCreate={handleCreate}
            />
          )}
        </div>
      </Modal>

      <LockScreen
        active={creating}
        title="Starting your jam…"
        detail="Painting the cover art and putting it on Arweave. This takes a few seconds — hang tight."
      />
    </>
  );
}

// The menu. Album and Mixtape are deliberately present and disabled rather than
// absent — the artist should be able to see that the label makes three things and
// that two of them aren't ready, instead of wondering where they went.
function ChooseView({ onPickJam }: { onPickJam: () => void }) {
  return (
    <>
      <h2 className="font-display text-lg text-center uppercase tracking-wide">
        What would you like to create?
      </h2>
      <div className="flex flex-col gap-sm">
        <CreateOption label="Jam" hint="Your fans write it. One song survives." onClick={onPickJam} />
        <CreateOption label="Album" hint="Coming soon" />
        <CreateOption label="Mixtape" hint="Coming soon" />
      </div>
    </>
  );
}

// One row of the menu. No `onClick` is what makes an option unavailable, so a
// coming-soon entry can't be wired up by accident.
function CreateOption({
  label,
  hint,
  onClick,
}: {
  label: string;
  hint: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="flex flex-col items-center gap-xs w-full rounded-md border-sm border-border
                 bg-transparent px-lg py-md text-center transition-base
                 enabled:hover:border-accent enabled:active:scale-[0.98]"
    >
      <span className="font-display text-sm">{label}</span>
      <span className="text-xs text-muted">{hint}</span>
    </button>
  );
}

// What a jam is, and the one thing the artist gets to author about it. The copy
// spells out the whole 7-day shape up front because the destructive half — the
// also-rans being deleted — happens days later and can't be taken back.
function JamView({
  cta,
  onCtaChange,
  onBack,
  onCreate,
}: {
  cta: string;
  onCtaChange: (value: string) => void;
  onBack: () => void;
  onCreate: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-sm">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to create menu"
          className="flex items-center justify-center w-8 h-8 shrink-0 rounded-full bg-surface-2
                     p-0 text-white active:opacity-70 transition-opacity"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>
        <h2 className="font-display text-lg uppercase tracking-wide">Jam Creator</h2>
      </div>

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
        onChange={onCtaChange}
        maxLength={CTA_MAX}
        placeholder="Let's go fam!"
        help="optional"
      />

      {/* `special`, like every other terminal form action in the app (the
          application form, the commission ask, the songwriter). */}
      <button type="button" onClick={onCreate} className="special full-width">
        Create
      </button>
    </>
  );
}
