import { useCallback, useState, useEffect } from 'react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import { voteSong, VoteType, SongStats } from '../../services/api';
import './bop-meter.css';

const VOTED_KEY = 'slopbop_votes';

function getVotedSongs(): Record<string, VoteType> {
  try {
    return JSON.parse(localStorage.getItem(VOTED_KEY) || '{}');
  } catch {
    return {};
  }
}

function markVoted(songId: string, type: VoteType) {
  const voted = getVotedSongs();
  voted[songId] = type;
  localStorage.setItem(VOTED_KEY, JSON.stringify(voted));
}

export default function BopMeter() {
  const { track } = useMusicPlayer();

  const [stats, setStats] = useState<SongStats | null>(null);
  const [userVote, setUserVote] = useState<VoteType | null>(null);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    if (!track) return;
    setStats(track.stats ?? null);
    setUserVote(getVotedSongs()[track.id] ?? null);
  }, [track]);

  const handleVote = useCallback(async (type: VoteType) => {
    if (!track || userVote || voting) return;
    setVoting(true);
    try {
      const updated = await voteSong(track.id, type);
      setStats(updated);
      setUserVote(type);
      markVoted(track.id, type);
    } finally {
      setVoting(false);
    }
  }, [track, userVote, voting]);

  if (!stats) return null;

  const bopPercent = stats.totalVotes > 0
    ? Math.round((stats.bops / stats.totalVotes) * 100)
    : 0;

  return (
    <div className="bop-meter-strip relative overflow-hidden py-xl my-md">
      <div className="bop-meter-bg absolute inset-0 -z-10" />

      <div className="flex flex-col items-center gap-sm px-xl relative">
        <p className="font-display text-2xl">
          {bopPercent}% BOP
        </p>

        <p className="text-xs text-secondary">
          {stats.totalVotes} Voted
        </p>

        <div className="flex gap-md w-full max-w-[320px]">
          <button
            type="button"
            disabled={!!userVote || voting}
            onClick={() => handleVote('slop')}
            className={`flex-1 py-sm rounded-lg font-bold text-sm transition-base cursor-pointer
              ${userVote === 'slop'
                ? 'bg-[var(--red)] text-white'
                : userVote
                  ? 'bg-[var(--bg-surface)] text-[var(--text-muted)] cursor-not-allowed'
                  : 'bg-[var(--bg-surface)] text-[var(--red)] active:scale-95'
              }`}
          >
            SLOP 🤮
          </button>
          <button
            type="button"
            disabled={!!userVote || voting}
            onClick={() => handleVote('bop')}
            className={`flex-1 py-sm rounded-lg font-bold text-sm transition-base cursor-pointer
              ${userVote === 'bop'
                ? 'bg-[var(--yellow)] text-[var(--black)]'
                : userVote
                  ? 'bg-[var(--bg-surface)] text-[var(--text-muted)] cursor-not-allowed'
                  : 'bg-[var(--bg-surface)] text-[var(--yellow)] active:scale-95'
              }`}
          >
            BOP 🤩
          </button>
        </div>
      </div>
    </div>
  );
}
