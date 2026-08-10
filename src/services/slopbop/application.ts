import { API_URL, apiFetch } from './client';

// Static form data, served from memory by the backend. Fetch once on mount and
// cache — every step of the form is rendered from this.
export interface FormConfig {
  scale: string[];            // Likert statements, in source order (weights are server-side only)
  taste_questions: string[];  // the open questions — who you are and what your music is
  answer_length: {            // per-answer length bounds, trimmed — the server's own numbers
    min: number;
    max: number;
  };
  zodiac: string[];           // 12 signs for the dropdown
  genres: {                   // multi-select options + how many may be picked
    max_select: number;
    options: string[];
  };
}

// Everything the form collects. Wire format is snake_case; the backend is the
// trust boundary, so these mirror its validation rules in the comments only.
//
// `taste_answers` is plain strings *in config order* — the server pairs each one
// to its question by position and stamps the question text itself. Sending
// {question, answer} objects is rejected as "must be text".
export interface ApplicationPayload {
  name: string;             // 1–32 chars, letters/numbers/space/_/- only
  gender: 'male' | 'female';
  scale_answers: number[];  // exactly config.scale.length ints, each 1–5, in source order
  taste_answers: string[];  // one per config.taste_questions, in that order, each within config.answer_length
  zodiac_sign: string;      // one of config.zodiac
  genres: string[];         // 1..config.genres.max_select distinct, each from config.genres.options
  email?: string | null;    // optional; standard email, <=100
}

// Returned on a successful 201. `archetype` is the derived personality result
// (12 possible values). `scale_answers` are never returned.
export interface ApplicationResult {
  name: string;
  archetype: string;
}

// Discriminated outcome of submit: success carries the result, validation
// failure carries the field→message map (keyed by payload field name, every
// failing field in one pass). A 500 (or network error) rejects.
export type SubmitOutcome =
  | { ok: true; data: ApplicationResult }
  | { ok: false; errors: Record<string, string> };

export const fetchFormConfig = () =>
  apiFetch<FormConfig>('/slopbop/form/config');

// POST the filled form. Bypasses `apiFetch` because the 400 response carries a
// field-error body we need to read rather than discard.
export async function submitApplication(
  payload: ApplicationPayload,
): Promise<SubmitOutcome> {
  const res = await fetch(`${API_URL}/slopbop/form/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();

  if (res.status === 201) return { ok: true, data: data as ApplicationResult };
  if (res.status === 400) {
    return { ok: false, errors: (data.errors ?? {}) as Record<string, string> };
  }
  throw new Error(data.error || 'Submit failed');
}
