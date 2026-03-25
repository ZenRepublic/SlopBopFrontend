import { useMusicPlayer } from '../../context/MusicPlayerContext';

export default function MiniPlayer() {
  const { track, playing, togglePlay, expand, close, expanded } = useMusicPlayer();

  if (!track || expanded) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[var(--z-modal-backdrop)]
                 bg-[var(--yellow)] border-t border-[var(--border)]
                 flex items-center gap-sm px-md py-sm cursor-pointer
                 active:opacity-80 transition-base"
      onClick={expand}
    >
      <img
        src={track.coverUrl || '/Images/default_song_cover.png'}
        alt={track.title}
        className="w-10 h-10 object-cover rounded-sm flex-shrink-0"
      />

      <span className="text-sm font-medium truncate flex-1 text-[var(--text-alt)]">{track.title}</span>

      <div className="flex items-center flex-shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center
                     cursor-pointer active:scale-90 transition-base mr-md"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" fill="var(--black)" className="w-4 h-4">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="var(--black)" className="w-4 h-4 ml-0.5">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            expand();
          }}
          className="w-8 h-8 flex items-center justify-center
                     cursor-pointer active:scale-90 transition-base"
        >
          <svg viewBox="0 0 24 24" fill="var(--black)" className="w-5 h-5">
            <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            close();
          }}
          className="w-8 h-8 flex items-center justify-center
                     cursor-pointer active:scale-90 transition-base"
        >
          <img src="/Icons/CloseIcon.PNG" alt="Close" className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
