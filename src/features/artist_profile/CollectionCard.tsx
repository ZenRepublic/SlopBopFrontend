interface Props {
  coverUrl?: string;
  title: string;
  onClick: () => void;
}

export default function CollectionCard({ coverUrl, title, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col rounded-t-lg overflow-hidden text-left cursor-pointer
                 active:scale-95 transition-base"
    >
      <img
        src={coverUrl || '/Images/default_song_cover.png'}
        alt={title}
        className="w-full aspect-square object-cover block"
      />
      <div className="w-full bg-[var(--bg-secondary)] px-sm py-sm">
        <p className="text-sm truncate">{title}</p>
      </div>
    </button>
  );
}