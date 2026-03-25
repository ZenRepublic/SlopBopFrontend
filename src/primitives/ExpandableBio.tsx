import React, { useRef, useState } from 'react';

export default function ExpandableBio({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  React.useEffect(() => {
    const el = textRef.current;
    if (el) setClamped(el.scrollHeight > el.clientHeight);
  }, [text]);

  return (
    <div className="text-sm leading-relaxed text-left">
      <p
        ref={textRef}
        className={expanded ? '' : 'line-clamp-2'}
      >
        {text}
        {expanded && (
          <button
            onClick={() => setExpanded(false)}
            className="text-accent ml-1 inline"
          >
            hide
          </button>
        )}
      </p>
      {clamped && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="text-accent mt-1"
        >
          show
        </button>
      )}
    </div>
  );
}