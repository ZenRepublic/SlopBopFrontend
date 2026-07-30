import { useState } from 'react';
import {
  Field,
  FormSection,
  TextField,
  TextAreaField,
  ButtonGroup,
  Dropdown,
  MultiSelect,
  type ButtonGroupOption,
} from '../../primitives/form';
import { AuditionSection } from './AuditionSection';
import { LikertSection } from './LikertSection';
import { toZodiacOptions } from './zodiac';
import { useFormConfig } from '../../hooks/useFormConfig';
import { useSubmitApplication } from '../../hooks/useSubmitApplication';
import { useToast } from '../../context/ToastContext';
import { type ApplicationPayload } from '../../services/slopbop';

// Field length caps, mirroring the backend's validation rules.
const NICKNAME_MAX = 32;
const BIO_MAX = 140;
const SINGER_MAX = 32;
const AUDITION_MAX = 300;
const X_HANDLE_MAX = 32;
const EMAIL_MAX = 100;

// Allowed-character / format rules, mirroring the backend. Nickname is a stage
// name, so spaces are allowed (the backend trims leading/trailing).
const NICKNAME_RE = /^[a-zA-Z0-9 _-]+$/;
const X_HANDLE_RE = /^[a-zA-Z0-9_]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Gender = 'male' | 'female';

const GENDER_OPTIONS: ButtonGroupOption<Gender>[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

export default function ApplicationForm() {
  const { config, loading, error } = useFormConfig();
  const { submit, submitting, fieldErrors, result } = useSubmitApplication();
  const { showToast } = useToast();

  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [zodiac, setZodiac] = useState<string | null>(null);
  const [favoriteSinger, setFavoriteSinger] = useState('');
  const [auditionAnswers, setAuditionAnswers] = useState(['', '', '', '']);
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);
  const [xHandle, setXHandle] = useState('');
  const [email, setEmail] = useState('');
  const [scaleAnswers, setScaleAnswers] = useState<Record<number, number>>({});

  // The 4 audition questions (one per bucket) come pre-randomized from the
  // backend; just answer them in order.
  const auditionQuestions = config?.open_questions ?? null;

  const setAnswer = (index: number, value: string) =>
    setAuditionAnswers(prev => prev.map((a, i) => (i === index ? value : a)));

  const setScaleAnswer = (index: number, value: number) =>
    setScaleAnswers(prev => ({ ...prev, [index]: value }));
  const resetScale = () => setScaleAnswers({});

  // Per-field validity. Optional fields are valid when blank; a non-blank but
  // malformed optional field is invalid and blocks submission.
  const nicknameValid = NICKNAME_RE.test(nickname) && nickname.length <= NICKNAME_MAX;
  const bioValid = bio.trim().length > 0 && bio.length <= BIO_MAX;
  const genderValid = gender !== null;
  const zodiacValid = zodiac !== null;
  const singerValid = favoriteSinger.trim().length > 0 && favoriteSinger.length <= SINGER_MAX;
  // Required → at least one; the upper bound is enforced by the MultiSelect.
  const genresValid = favoriteGenres.length > 0;
  // Per-question completion drives the step buttons; the tier is valid only
  // once every question is complete.
  const auditionComplete = auditionAnswers.map(a => a.trim().length > 0 && a.length <= AUDITION_MAX);
  const auditionValid = !!auditionQuestions && auditionComplete.every(Boolean);
  const xHandleValid = xHandle === '' || (xHandle.length <= X_HANDLE_MAX && X_HANDLE_RE.test(xHandle));
  const emailValid = email === '' || (email.length <= EMAIL_MAX && EMAIL_RE.test(email));
  // Every statement answered with a 1–5 value.
  const scaleValid = !!config && config.scale.every((_, i) => {
    const v = scaleAnswers[i];
    return v >= 1 && v <= 5;
  });

  const allValid =
    nicknameValid && bioValid && genderValid && zodiacValid &&
    singerValid && genresValid && scaleValid && auditionValid && xHandleValid && emailValid;

  async function handleApply() {
    if (!allValid || !config || !gender || !zodiac || !auditionQuestions) return;

    const payload: ApplicationPayload = {
      name: nickname,
      gender,
      bio,
      scale_answers: config.scale.map((_, i) => scaleAnswers[i]),
      audition_answers: auditionQuestions.map((question, i) => ({
        question,
        answer: auditionAnswers[i],
      })),
      zodiac_sign: zodiac,
      genres: favoriteGenres,
      favorite_singer: favoriteSinger,
      twitter: xHandle || null,
      email: email || null,
    };

    try {
      const outcome = await submit(payload);
      // On success the hook's `result` flips us to the thank-you screen below.
      if (!outcome.ok) {
        showToast('Please fix the highlighted fields and try again.', 'warning');
      }
    } catch {
      showToast('Something went wrong. Please try again.');
    }
  }

  if (result) {
    return (
      <div className="flex flex-col items-center gap-lg py-4xl px-md text-center">
        <img src="/Branding/cds_thankyou.png" alt="Thank you" className="w-full" />
        <p className="text-base leading-relaxed">
          Thanks for taking the time to apply.
          <br />
          Hope to see you come to life as an artist in the SlopBop show!
        </p>
      </div>
    );
  }

  if (loading) {
    return <p className="text-center py-4xl">Loading form…</p>;
  }
  if (error || !config) {
    return <p className="text-center text-error py-4xl">{error ?? 'Failed to load form'}</p>;
  }

  return (
    <div className="flex flex-col gap-xl py-lg px-md">
      <header className="flex flex-col gap-sm">
        <h1 className="font-display text-xl">Application Form</h1>
        <p className="text-sm leading-relaxed">
          Apply for a chance to become a synthetic artist inside slopbop show. Feel free to answer either truthfully or roleplay as a character from your imagination!
        </p>
        <p className="text-sm leading-relaxed">
          Got an AI assistant? They can fill it up for you!
          <br />
          Tell them to read this page:{' '}
          <a
            href="https://www.slopbop.com/form/SKILL.md"
            className="text-accent underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            slopbop.com/form/SKILL.md
          </a>
        </p>
      </header>

      <div className="form">
        <TextField
          label="Nickname"
          required
          value={nickname}
          onChange={setNickname}
          maxLength={NICKNAME_MAX}
          error={fieldErrors.name}
        />

        <TextAreaField
          label="Bio"
          required
          value={bio}
          onChange={setBio}
          maxLength={BIO_MAX}
          rows={3}
          placeholder="Introduce yourself in a sentence or two"
          error={fieldErrors.bio}
        />

        <Field label="Gender" required error={fieldErrors.gender}>
          <ButtonGroup
            options={GENDER_OPTIONS}
            value={gender}
            onChange={setGender}
            columns={2}
          />
        </Field>

        <Field label="Zodiac sign" required error={fieldErrors.zodiac_sign}>
          <Dropdown
            options={toZodiacOptions(config.zodiac)}
            value={zodiac}
            onChange={setZodiac}
            placeholder="Select"
            error={!!fieldErrors.zodiac_sign}
          />
        </Field>

        <LikertSection
          statements={config.scale}
          answers={scaleAnswers}
          onAnswer={setScaleAnswer}
          onReset={resetScale}
          error={fieldErrors.scale_answers}
        />

        <TextField
          label="Favorite artist"
          required
          value={favoriteSinger}
          onChange={setFavoriteSinger}
          maxLength={SINGER_MAX}
          placeholder="e.g. Kanye West"
          error={fieldErrors.favorite_singer}
        />

        <Field
          label="Favorite genres"
          required
          help={`${favoriteGenres.length}/${config.genres.max_select} selected`}
          error={fieldErrors.genres}
        >
          <MultiSelect
            options={config.genres.options}
            value={favoriteGenres}
            onChange={setFavoriteGenres}
            max={config.genres.max_select}
            addPlaceholder="Add a genre…"
          />
        </Field>

        {auditionQuestions && (
          <AuditionSection
            questions={auditionQuestions}
            answers={auditionAnswers}
            complete={auditionComplete}
            onAnswerChange={setAnswer}
            maxLength={AUDITION_MAX}
            error={fieldErrors.audition_answers}
          />
        )}

        <FormSection
          title="Contacts"
          description="Please provide your contact to be notified in case your application was selected."
        >
          <TextField
            label="X handle"
            value={xHandle}
            onChange={value => setXHandle(value.replace(/^@+/, ''))}
            maxLength={X_HANDLE_MAX}
            prefix="@"
            placeholder="handle"
            help="optional"
            error={fieldErrors.twitter}
          />

          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            maxLength={EMAIL_MAX}
            placeholder="you@example.com"
            help="optional"
            error={fieldErrors.email}
          />
        </FormSection>

        <button
          type="button"
          className="special full-width"
          disabled={!allValid || submitting}
          onClick={handleApply}
        >
          {submitting ? 'Applying…' : 'Apply'}
        </button>
      </div>
    </div>
  );
}
