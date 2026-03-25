interface Props {
  coverUrl?: string;
  title: string;
  duration?: number;
  onClick: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function SingleCard({ coverUrl, title, duration, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-sm w-full text-left cursor-pointer
                 active:opacity-70 transition-base"
    >
      <img
        src={coverUrl || '/Images/default_song_cover.png'}
        alt={title}
        className="w-10 h-10 object-cover rounded-sm flex-shrink-0"
      />
      <p className="text-sm truncate flex-1">{title}</p>
      {duration != null && (
        <span className="text-sm text-secondary flex-shrink-0">{formatDuration(duration)}</span>
      )}
    </button>
  );
}