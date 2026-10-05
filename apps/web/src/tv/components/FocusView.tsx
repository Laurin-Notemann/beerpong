import { Avatar } from '~/tv/components/Avatar';
import { Delta, RankMove } from '~/tv/components/Leaderboard';
import { LiveMatchCard } from '~/tv/components/LiveMatchCard';
import type { LiveMatchView, LiveTeam } from '~/tv/server/board';

/**
 * One live match on the whole screen: the match as large as it gets, under it every player with
 * what the match does to them if it ended now (points, Elo and place on the leaderboard), and
 * the moves down the whole right side.
 */
export function FocusView({ match }: { match: LiveMatchView }) {
    return (
        <div className="flex min-h-0 flex-1 gap-[2rem]">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-[2rem]">
                <LiveMatchCard
                    match={match}
                    size="lg"
                    players={false}
                    className="min-h-0 flex-[1.3]"
                />
                <div className="grid min-h-0 flex-1 grid-cols-2 gap-[2rem]">
                    <Players team={match.blue} side="blue" />
                    <Players team={match.red} side="red" />
                </div>
            </div>
            <Moves moves={match.moves} />
        </div>
    );
}

/**
 * The cup hits so far, newest at the top, in one grid: who, with which move, and the score right
 * after it with the side that just scored in its color.
 */
function Moves({ moves }: { moves: LiveMatchView['moves'] }) {
    return (
        <section className="flex min-h-0 w-[40rem] shrink-0 flex-col gap-[1.2rem] overflow-hidden rounded-[2rem] border border-line bg-panel px-[2.2rem] py-[2rem]">
            <h2 className="flex justify-between text-[1.4rem] font-semibold tracking-[0.18em] text-text-2">
                <span>MOVES</span>
                {moves.length > 0 && <span className="tabular">{moves.length}</span>}
            </h2>
            {moves.length === 0 ? (
                <p className="text-[1.8rem] text-text-3">No cups yet</p>
            ) : (
                <ol className="flex min-h-0 flex-col gap-[0.4rem]">
                    {moves.map((m, i) => (
                        <li
                            key={moves.length - i}
                            className={`grid grid-cols-[3.6rem_13rem_minmax(0,1fr)_auto] items-center gap-[1.2rem] rounded-[1.2rem] px-[1rem] py-[0.9rem] ${i === 0 ? 'rise bg-panel-2' : ''}`}
                        >
                            <Avatar
                                name={m.name}
                                url={m.avatarUrl}
                                className="size-[3.6rem] text-[1.4rem]"
                            />
                            <span
                                className={`truncate text-[2rem] font-bold ${m.team === 'blue' ? 'text-blue' : 'text-red'}`}
                            >
                                {m.name}
                            </span>
                            <span
                                className={`truncate text-[1.8rem] ${i === 0 ? 'text-text' : 'text-text-2'}`}
                            >
                                {m.move}
                            </span>
                            <span className="tabular flex shrink-0 items-center gap-[0.4rem] text-[2.2rem] font-extrabold">
                                <span className={m.team === 'blue' ? 'text-blue' : 'text-text-3'}>
                                    {m.blue}
                                </span>
                                <span className="font-semibold text-text-3">–</span>
                                <span className={m.team === 'red' ? 'text-red' : 'text-text-3'}>
                                    {m.red}
                                </span>
                            </span>
                        </li>
                    ))}
                </ol>
            )}
        </section>
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
