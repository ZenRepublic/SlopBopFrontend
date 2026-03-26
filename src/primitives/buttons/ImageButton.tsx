import { ReactNode } from 'react';

interface ImageButtonProps {
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  target?: string;
  rel?: string;
  ariaLabel?: string;
  ariaDisabled?: boolean;
  children: ReactNode;
  className?: string;
}

export function ImageButton({
  href,
  onClick,
  disabled = false,
  target,
  rel,
  ariaLabel,
  ariaDisabled,
  children,
  className = '',
}: ImageButtonProps) {
  const classes = `image-button ${disabled ? 'disabled' : ''} ${className}`.trim();

  if (href) {
    return (
      <a
        href={disabled ? undefined : href}
        onClick={(e) => {
          if (disabled) e.preventDefault();
          onClick?.(e);
        }}
        target={target}
        rel={rel}
        aria-label={ariaLabel}
        aria-disabled={ariaDisabled}
        className={classes}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={classes}
    >
      {children}
    </button>
  );
}
