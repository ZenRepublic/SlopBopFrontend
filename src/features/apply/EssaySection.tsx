import { useState } from 'react';
import { FormSection, StepNav, TextAreaField } from '../../primitives/form';

interface EssaySectionProps {
  questions: string[];
  answers: string[];
  onAnswerChange: (index: number, value: string) => void;
  maxLength: number;
  // Group-level error (personality_answers / craft_answers).
  error?: string;
  // Accessible name for the step buttons, e.g. "Personality questions".
  ariaLabel: string;
}

// One open-answer section as a stepped questionnaire: numbered buttons switch
// between questions, one is shown at a time, and each turns green once
// answered. Rendered twice — once for personality, once for craft — since the
// config hands the two sets pre-split so they can be labelled apart. The
// section's own heading is the step header, outside the card.
export function EssaySection({
  questions,
  answers,
  onAnswerChange,
  maxLength,
  error,
  ariaLabel,
}: EssaySectionProps) {
  const [active, setActive] = useState(0);
  const complete = questions.map((_, i) => {
    const answer = answers[i] ?? '';
    return answer.trim().length > 0 && answer.trim().length <= maxLength;
  });

  return (
    <FormSection error={error}>
      <TextAreaField
        label={questions[active]}
        largeLabel
        required
        value={answers[active] ?? ''}
        onChange={value => onAnswerChange(active, value)}
        maxLength={maxLength}
        rows={4}
      />
      <div className="flex justify-center">
        <StepNav
          count={questions.length}
          active={active}
          complete={complete}
          onSelect={setActive}
          ariaLabel={ariaLabel}
        />
      </div>
    </FormSection>
  );
}
