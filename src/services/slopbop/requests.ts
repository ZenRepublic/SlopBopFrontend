import { API_URL } from './client';
import { RequestStatus } from './collections';

// A song submission against a collection. The collection id travels in the URL,
// not the body. Wire format mirrors the backend's validation rules (in comments
// only — the backend is the trust boundary). `text` preserves internal line
// breaks (server normalizes \r\n / \r → \n and trims only the outer edges).
export interface SongRequestPayload {
  author: string; // required, ≤ 18 chars (trimmed)
  text: string;   // required, ≤ 260 chars
}

// Returned on a successful 201. The submit endpoint also echoes the freshly
// re-evaluated window so the caller can update the capacity gauge without a
// separate refetch.
export interface SongRequestResult {
  request_id: string;
  request_status: RequestStatus;
}

// Why a collection isn't accepting submissions. Shared by the collection
// detail's `request_status.reason` and the submit endpoint's 409 body.
export type RequestClosedReason =
  | 'not_started'     // before submission_start (mixtape only — a jam has no window)
  | 'deadline_passed' // past submission_deadline (mixtape only)
  | 'full'      // submission_count reached max_tracks
  | 'not_configured'  // max_tracks never authored
  // The collection's type takes no submissions at all — i.e. a plain `album`,
  // which the artist authors rather than crowdsources. The string is the
  // backend's wire value and is left verbatim despite the rename: nothing here
  // branches on it, so renaming it frontend-side would only invent a mismatch.
  | 'not_an_album';

// Discriminated outcome of submit:
//   ok         → the new request id + the updated window
//   validation → field→message map from a 400 (same shape as the application form)
//   closed     → the window closed server-side between load and submit (409); the
//                caller should surface the message and refresh the collection
// A 404 (collection not found), 500, or network error rejects.
export type SongRequestOutcome =
  | { ok: true; data: SongRequestResult }
  | { ok: false; kind: 'validation'; errors: Record<string, string> }
  | { ok: false; kind: 'closed'; reason: RequestClosedReason; message: string };

// POST a song submission against a collection. Bypasses `apiFetch` because the
// 400/409 responses carry bodies (field errors / closed reason) we need to read
// rather than discard.
export async function submitSongRequest(
  collectionId: string,
  payload: SongRequestPayload,
): Promise<SongRequestOutcome> {
  const res = await fetch(`${API_URL}/slopbop/collections/${collectionId}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();

  if (res.status === 201) {
    return {
      ok: true,
      data: { request_id: data.request_id, request_status: data.request_status },
    };
  }
  if (res.status === 400) {
    return {
      ok: false,
      kind: 'validation',
      errors: (data.errors ?? {}) as Record<string, string>,
    };
  }
  if (res.status === 409) {
    return {
      ok: false,
      kind: 'closed',
      reason: data.reason as RequestClosedReason,
      message: data.error || 'Song submissions are closed for this collection',
    };
  }
  throw new Error(data.error || 'Request failed');
}
