import { useState, useCallback } from 'react';
import {
  submitSongRequest,
  submitSignedSongRequest,
  SongRequestPayload,
  SongRequestResult,
  SongRequestOutcome,
} from '../services/slopbop';
import { useAuth } from '../context/AuthContext';

// Command-shaped mutation hook: POST a song request and surface the result.
// `fieldErrors` maps payload field names → messages from a 400; map them onto
// inputs. A 404 / 500 / network error rejects — callers should show a generic
// retry.
//
// Which of the two doors it posts through is decided here, from the session
// alone: signed in, the typed name is dropped and the server credits the account
// instead. Callers pass the same payload either way and never choose an endpoint,
// so the form and the request can't disagree about who's submitting.
export function useSubmitSongRequest() {
  const { isAuthed } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SongRequestResult | null>(null);

  const submit = useCallback(
    async (collectionId: string, payload: SongRequestPayload): Promise<SongRequestOutcome> => {
      setSubmitting(true);
      setFieldErrors({});
      try {
        const outcome = isAuthed
          ? await submitSignedSongRequest(collectionId, { text: payload.text })
          : await submitSongRequest(collectionId, payload);
        if (outcome.ok) setResult(outcome.data);
        else if (outcome.kind === 'validation') setFieldErrors(outcome.errors);
        return outcome;
      } finally {
        setSubmitting(false);
      }
    },
    [isAuthed],
  );

  return { submit, submitting, fieldErrors, result };
}
