import { useEffect, useRef, useState } from 'react';
import { ARWEAVE_MAX_RETRIES, ARWEAVE_RETRY_DELAY_MS, isArweaveUrl } from '../config/arweave';

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  /** Box classes (size, aspect ratio, rounding) applied to the frame wrapper. */
  className?: string;
  /** object-fit / object-position classes applied to the <img> itself. Defaults to `object-cover`. */
  imgClassName?: string;
  /**
   * Optional tiny/low-res image URL shown blurred while the full image loads (true "blur-up").
   * When omitted, an animated shimmer skeleton is shown instead.
   */
  placeholderSrc?: string;
};

/**
 * Remote image with a placeholder + fade-in.
 *
 * Fixes the "reveals slowly from the top" effect on slow connections by decoding
 * off-thread (`decoding="async"`) and fading the whole image in at once, over a
 * shimmer (or a blurred low-res `placeholderSrc`). `loading="lazy"` means offscreen
 * images (grids, lists) aren't fetched until they scroll into view.
 *
 * Note: this improves *perceived* speed only — it can't shrink the download.
 * Serving smaller variants + `Cache-Control` headers from the server is the real fix.
 *
 * Arweave sources get two extras (see `config/arweave`): a failed load is retried
 * quietly under the shimmer rather than shown as a broken frame, and the request
 * is made in CORS mode so the service worker sees a real status. Without that the
 * response is opaque, and Workbox can't tell a gateway blip from the image —
 * it would cache the blip *as* the image, permanently.
 */
export default function Img({
  className = '',
  imgClassName = 'object-cover',
  placeholderSrc,
  loading = 'lazy',
  onLoad,
  onError,
  alt = '',
  src,
  ...rest
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const ref = useRef<HTMLImageElement>(null);
  const retryTimer = useRef<number | undefined>(undefined);

  // A new src is a new load: reset during render rather than in an effect, so
  // the retry counter can't briefly survive into the new src's key and cost an
  // extra fetch.
  const [prevSrc, setPrevSrc] = useState(src);
  if (src !== prevSrc) {
    setPrevSrc(src);
    setAttempt(0);
    setLoaded(false);
  }

  // Cached images may finish before React attaches onLoad — reveal them immediately.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, [src, attempt]);

  useEffect(() => () => window.clearTimeout(retryTimer.current), []);

  const retryable = typeof src === 'string' && isArweaveUrl(src);

  return (
    <span className={`img-frame ${className}`}>
      {placeholderSrc ? (
        <img
          src={placeholderSrc}
          alt=""
          aria-hidden="true"
          className={`img-blur ${imgClassName}`}
          data-hidden={loaded || undefined}
        />
      ) : (
        <span className="img-shimmer" data-hidden={loaded || undefined} aria-hidden="true" />
      )}
      <img
        {...rest}
        // Remounting on `attempt` is what re-issues the request — assigning the
        // same src back isn't reliably a reload.
        key={attempt}
        ref={ref}
        src={src}
        alt={alt}
        crossOrigin={retryable ? 'anonymous' : undefined}
        loading={loading}
        decoding="async"
        className={`img-el ${imgClassName}`}
        data-loaded={loaded || undefined}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        onError={(e) => {
          // The gateway blips more than it should. Retry under the shimmer, so a
          // transient 504 doesn't leave a broken frame on the page.
          if (retryable && attempt < ARWEAVE_MAX_RETRIES) {
            retryTimer.current = window.setTimeout(
              () => setAttempt(a => a + 1),
              ARWEAVE_RETRY_DELAY_MS,
            );
            return;
          }
          setLoaded(true); // reveal broken-image state rather than a permanent shimmer
          onError?.(e);
        }}
      />
    </span>
  );
}
