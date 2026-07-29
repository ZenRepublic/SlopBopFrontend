interface Props {
  /**
   * The server's answer for the session that asked, straight from `useArtist` —
   * never a client-side comparison against `owner_wallet`. It's a rendering hint,
   * so everything gated on it is UI only; the endpoints behind these actions do
   * their own checking.
   */
  isOwner: boolean;
}

/**
 * The owner's controls overlaid on the artist hero, balancing the back button
 * across from them. Self-gating: renders nothing for anyone who doesn't own this
 * artist, so the profile can drop it in unconditionally.
 *
 * Both buttons are inert for now — there are no owner-gated endpoints yet, so
 * their real job is being the visible proof that the session came back as this
 * artist's owner. Create wears lime because it's the one thing on the page only
 * you can do; settings stays in the back button's black, since it's chrome
 * rather than the point.
 *
 * This folder is where owner-only surfaces go. Anything that appears *because*
 * you own the artist belongs here rather than in the shared profile components,
 * so the ownership boundary stays visible in the file tree.
 */
export default function OwnerActions({ isOwner }: Props) {
  if (!isOwner) return null;

  return (
    <div className="absolute top-lg right-lg z-10 flex items-center gap-sm">
      <button
        type="button"
        className="flex items-center justify-center w-12 h-12 rounded-full bg-accent text-alt active:opacity-70 transition-opacity"
        aria-label="Create"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
      </button>

      <button
        type="button"
        className="flex items-center justify-center w-12 h-12 rounded-full bg-black/70 text-white active:opacity-70 transition-opacity"
        aria-label="Settings"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
          <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
        </svg>
      </button>
    </div>
  );
}
