import { useState, useRef, useLayoutEffect } from 'react';
import { useSubmitSongRequest } from '../../hooks/useSubmitSongRequest';
import { useToast } from '../../context/ToastContext';
import {
  LINE_MAX,
  MAX_LINES,
  blankPage,
  contentLength,
  mergeUp,
  pageToText,
  pasteAt,
  splitLine,
  writableMax,
  type PageEdit,
  type Spot,
} from './lyricLines';

// Field length caps, mirroring the backend's validation rules. TEXT_MAX counts
// the line breaks too, since they're part of what's submitted — so the writer's
// budget is what's left once a full page's breaks are paid for. Derived, not
// typed in: change either cap and this follows.
const AUTHOR_MAX = 18;
const TEXT_MAX = 260;
const WRITABLE_MAX = writableMax(TEXT_MAX);

// Device-level one-per-person dedup, for the collections that ask for it (see
// `oncePerDevice`). The submission endpoint has no auth, so the server can't
// enforce "one per person" — we remember which collections this device has
// already submitted to and show the thank-you notice on return visits.
// Best-effort only (cleared with site data), which is the intent.
const SUBMITTED_KEY = 'slopbop_submissions';

function getSubmittedCollections(): Record<string, true> {
  try {
    return JSON.parse(localStorage.getItem(SUBMITTED_KEY) || '{}');
  } catch {
    return {};
  }
}

function markSubmitted(collectionId: string) {
  const submitted = getSubmittedCollections();
  submitted[collectionId] = true;
  localStorage.setItem(SUBMITTED_KEY, JSON.stringify(submitted));
}

interface Props {
  /** The collection (mixtape or jam) this submission is written against. */
  collectionId: string;
  /** Submissions received so far — the numerator of the count header. */
  trackCount: number;
  /** Capacity — the denominator of the count header. Null when the collection
   *  was never given one, in which case the header shows the count alone rather
   *  than a fraction with a hole in it. */
  maxTracks: number | null;
  /** Cap this device at one submission for this collection: on success the
   * writer gives way to the thank-you notice, and stays that way on return
   * visits. Off by default — it takes as many submissions as the collection has
   * room for. Mixtapes opt in; jams don't. */
  oncePerDevice?: boolean;
  /** Refetch the collection so the count header advances and the window is
   * re-evaluated (capacity hit, or a 409 closes it). */
  refresh: () => void;
}

/**
 * The SongWriter — where a guest writes the lyrics for their song. Shared
 * verbatim by mixtapes and jams.
 *
 * Deliberately not a form. It's built as one instrument: a bezel carrying the
 * `count / max songs` header, an inset ruled screen the lyrics are written on,
 * the author's signature slot, and the send key (or a thank-you, where
 * `oncePerDevice` applies and this device has already submitted). The whole
 * point is that writing a song should feel like writing a song — filling a page
 * and handing it to the artist — rather than completing fields.
 *
 * The screen writes in lines — see `lyricLines.ts`. Every line of the page is
 * its own one-line field, present from the start, so any of them can be reached
 * by tap or by Tab rather than only existing once you've typed your way down to
 * it. A line stops at {@link LINE_MAX} characters and Enter is how you carry on;
 * nothing wraps or reflows under the cursor. Each line carries a handle, which
 * is inert today and is where reordering will hang off.
 *
 * It owns only the submission itself — the POST, validation, and per-device
 * dedup.
 *
 * Everything *around* it — the intro copy, any deadline countdown, the lifecycle
 * gating that decides whether the card shows at all — lives in the per-type
 * manager that renders it (mixtape `Submissions`, `JamSubmissions`), so this
 * stays identical for every collection type.
 */
export default function SongWriter({
  collectionId,
  trackCount,
  maxTracks,
  oncePerDevice = false,
  refresh,
}: Props) {
  const [submitted, setSubmitted] = useState(
    () => oncePerDevice && !!getSubmittedCollections()[collectionId],
  );
  const { submit, submitting, fieldErrors } = useSubmitSongRequest();
  const { showToast } = useToast();

  const [author, setAuthor] = useState('');
  const [page, setPage] = useState(blankPage);
  const text = pageToText(page);

  const lineRefs = useRef<(HTMLInputElement | null)[]>([]);
  // Where an edit wants the caret afterwards. Applied before paint, so moving
  // between lines never shows the caret in the wrong place first.
  const spotRef = useRef<Spot | null>(null);

  useLayoutEffect(() => {
    const spot = spotRef.current;
    spotRef.current = null;
    if (!spot) return;
    const el = lineRefs.current[spot.line];
    el?.focus();
    el?.setSelectionRange(spot.caret, spot.caret);
  }, [page]);

  /** Move the caret to a line without changing anything. */
  function goTo(line: number, caret: number) {
    if (line < 0 || line >= MAX_LINES) return;
    const el = lineRefs.current[line];
    el?.focus();
    const at = Math.min(caret, el?.value.length ?? 0);
    el?.setSelectionRange(at, at);
  }

  /**
   * Take a whole-page change if it fits the writing budget. Measured on the
   * written characters alone — the breaks are already paid for (see
   * `writableMax`), so the budget doesn't shift underfoot as lines are used.
   * The per-line cap is the input's own `maxLength`; this is the only other
   * limit, and refusing is the right answer for it — nothing already written
   * should be dropped to make room.
   */
  function commit(next: PageEdit | null): boolean {
    if (!next) return false;
    if (contentLength(next.page) > WRITABLE_MAX) return false;
    spotRef.current = next.spot;
    setPage(next.page);
    return true;
  }

  function setLine(line: number, value: string) {
    const next = [...page];
    next[line] = value;
    if (contentLength(next) > WRITABLE_MAX) return;
    setPage(next);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, line: number) {
    const el = e.currentTarget;
    const caret = el.selectionStart ?? 0;
    const selecting = el.selectionEnd !== caret;

    if (e.key === 'Enter') {
      e.preventDefault();
      commit(splitLine(page, line, caret));
    } else if (e.key === 'Backspace' && caret === 0 && !selecting) {
      // Only take over at the very head of a line — anywhere else Backspace is
      // just Backspace.
      e.preventDefault();
      commit(mergeUp(page, line));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      goTo(line - 1, caret);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      goTo(line + 1, caret);
    } else if (e.key === 'ArrowLeft' && caret === 0 && !selecting) {
      e.preventDefault();
      goTo(line - 1, Number.MAX_SAFE_INTEGER);
    } else if (e.key === 'ArrowRight' && caret === el.value.length && !selecting) {
      e.preventDefault();
      goTo(line + 1, 0);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>, line: number) {
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;
    e.preventDefault();
    const caret = e.currentTarget.selectionStart ?? 0;
    // Give up characters from the end of the paste until it fits the budget —
    // a long paste should fill the room that's left, not be refused outright.
    for (let keep = pasted.length; keep > 0; keep -= 1) {
      if (commit(pasteAt(page, line, caret, pasted.slice(0, keep)))) return;
    }
  }

  const remaining = WRITABLE_MAX - contentLength(page);

  const authorValid = author.trim().length > 0 && author.length <= AUTHOR_MAX;
  const textValid = text.trim().length > 0 && text.length <= TEXT_MAX;
  const allValid = authorValid && textValid;

  async function handleSend() {
    if (!allValid) return;
    try {
      const outcome = await submit(collectionId, { author, text });
      if (outcome.ok) {
        setAuthor('');
        setPage(blankPage());
        showToast('Song submitted successfully!', 'success');
        if (oncePerDevice) {
          markSubmitted(collectionId);
          setSubmitted(true);
        }
        // Advance the count header — it stays on screen after a submission
        // either way, so the room can watch the collection fill up.
        refresh();
      } else if (outcome.kind === 'closed') {
        // Window closed between load and submit — tell the user and refresh so
        // the writer gives way to the closed notice.
        showToast(outcome.message, 'warning');
        refresh();
      } else {
        showToast('Please fix the highlighted fields and try again.', 'warning');
      }
    } catch {
      showToast('Something went wrong. Please try again.');
    }
  }

  return (
    <div className="songwriter">
      <div className="songwriter__header">
        <h3 className="songwriter__title">Write a song</h3>
        <span className="songwriter__tally">
          {maxTracks == null ? `${trackCount} songs` : `${trackCount} / ${maxTracks} songs`}
        </span>
      </div>

      {submitted ? (
        <SubmittedNotice />
      ) : (
        <>
          {/* Every line of the page is here from the start as its own field —
              that's what makes any of them reachable by tap or by Tab, rather
              than only existing once you've typed your way down to it. The
              screen is just the window; it scrolls, and the browser brings the
              focused line into view on its own. */}
          <div className={`songwriter__screen${fieldErrors.text ? ' error' : ''}`}>
            {page.map((value, i) => (
              <div className={`songwriter__row${value ? ' written' : ''}`} key={i}>
                {/* The line's handle — inert for now, and deliberately outside
                    both the tab order and the a11y tree until it does
                    something. Leaving it focusable would put a dead stop
                    between every pair of lines, which is exactly the Tab flow
                    the page is built around. */}
                <button
                  type="button"
                  className="songwriter__handle"
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  {i + 1}
                </button>
                <input
                  ref={el => { lineRefs.current[i] = el; }}
                  type="text"
                  value={value}
                  // The line's own cap. Hitting it stops the line dead: no
                  // overflow, no reflow — Enter is how you carry on.
                  maxLength={LINE_MAX}
                  onChange={e => setLine(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(e, i)}
                  onPaste={e => handlePaste(e, i)}
                  placeholder={i === 0 ? "Start writing lyrics here..." : undefined}
                  aria-label={`Line ${i + 1}`}
                  // Mobile keyboards label the action key from this — "next"
                  // reads as "go to the line below", which is what Enter does.
                  enterKeyHint={i === MAX_LINES - 1 ? 'done' : 'next'}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                />
              </div>
            ))}
          </div>

          <div className="songwriter__readout">
            <span className={remaining <= 40 ? 'low' : undefined}>{remaining} characters left</span>
          </div>
          {fieldErrors.text && <p className="songwriter__error">{fieldErrors.text}</p>}

          <label className={`songwriter__author${fieldErrors.author ? ' error' : ''}`}>
            <span className="songwriter__author-label">written by</span>
            <input
              type="text"
              value={author}
              maxLength={AUTHOR_MAX}
              onChange={e => setAuthor(e.target.value)}
            />
          </label>
          {fieldErrors.author && <p className="songwriter__error">{fieldErrors.author}</p>}

          <button
            type="button"
            className="special full-width"
            disabled={!allValid || submitting}
            onClick={handleSend}
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </>
      )}
    </div>
  );
}

// Shown in place of the writer once this device has submitted. Any capacity gauge
// above still carries the count, so this only has to confirm the state.
function SubmittedNotice() {
  return (
    <div className="flex flex-col items-center gap-xs text-center rounded-lg border border-accent/30 bg-accent/5 py-lg px-md">
      <span className="text-2xl">🎉</span>
      <p className="text-sm font-semibold text-accent">Thanks for your submission!</p>
      <p className="text-xs text-muted">Only one submission per person is allowed.</p>
    </div>
  );
}
