import { Avatar } from '~/components/Avatar';
import { Delta, RankMove } from '~/components/Leaderboard';
import { LiveMatchCard } from '~/components/LiveMatchCard';
import type { LiveMatchView, LiveTeam } from '~/server/board';

/**
 * One live match on the whole screen: the match as large as it gets, and under it every player
 * with what the match does to them if it ended now: points, Elo and place on the leaderboard.
 */
export function FocusView({ match }: { match: LiveMatchView }) {
    return (
        <div className="flex min-h-0 flex-1 flex-col gap-[2rem]">
            <LiveMatchCard match={match} size="lg" className="min-h-0 flex-[1.3]" />
            <div className="grid min-h-0 flex-1 grid-cols-2 gap-[2rem]">
                <Players team={match.blue} side="blue" />
                <Players team={match.red} side="red" />
            </div>
        </div>
    );
}

function Players({ team, side }: { team: LiveTeam; side: 'blue' | 'red' }) {
    return (
        <ul className="flex min-h-0 flex-col gap-[1rem]">
            {team.players.map((p) => (
                <li
                    key={p.id}
                    className={`rise flex min-h-0 flex-1 items-center gap-[1.6rem] rounded-[1.6rem] border-l-[0.5rem] bg-panel px-[2rem] py-[1rem] ${side === 'blue' ? 'border-blue' : 'border-red'}`}
                >
                    <Avatar name={p.name} url={p.avatarUrl} className="size-[5rem] text-[1.8rem]" />
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-[2.4rem] font-bold">{p.name}</div>
                        {p.change ? (
                            <div className="tabular flex flex-wrap items-center gap-x-[1.2rem] text-[1.5rem] text-text-2">
                                <span>Elo {Math.round(p.change.newElo)}</span>
                                <span>
                                    #{p.change.newRank} <RankMove places={p.change.rank} />
                                </span>
                            </div>
                        ) : (
                            <div className="text-[1.5rem] text-text-3">Not on this leaderboard</div>
                        )}
                    </div>
                    {p.change && (
                        <div className="flex shrink-0 flex-col items-end gap-[0.4rem] text-[1.5rem]">
                            <Delta value={p.change.points} unit="pts" />
                            <Delta value={p.change.elo} unit="Elo" />
                        </div>
                    )}
                </li>
            ))}
        </ul>
    );
}
