import { Avatar } from '~/components/Avatar';
import { CupRack } from '~/components/CupRack';
import { Delta } from '~/components/Leaderboard';
import { useNow } from '~/lib/hooks';
import { formatElapsed } from '~/lib/liveMatch';
import type { LiveMatchView, LiveTeam } from '~/server/board';

/**
 * One live match in the narrow column next to the leaderboard: the two racks facing each other,
 * the score under them and each team's players with what the match does to their Elo so far.
 */
export function LiveMatchPanel({
    match,
    className = '',
}: {
    match: LiveMatchView;
    className?: string;
}) {
    const now = useNow();
    return (
        <section
            className={`rise flex flex-col gap-[1.6rem] rounded-[2rem] border border-line bg-panel p-[2rem] ${className}`}
        >
            <div className="flex items-center gap-3 text-[1.4rem] font-semibold">
                <span className="live-dot size-[0.9rem] rounded-full bg-live" />
                <span className="tracking-[0.18em] text-live">LIVE</span>
                <span className="tabular text-text-2">
                    {match.startedAt ? formatElapsed(now - Date.parse(match.startedAt)) : ''}
                </span>
            </div>
            <div className="flex items-center justify-between gap-[1rem]">
                <CupRack cups={match.blue.cups} team="blue" className="w-[11rem]" />
                <CupRack cups={match.red.cups} team="red" className="w-[11rem]" />
            </div>
            <div className="tabular flex items-center justify-center gap-[2rem] text-[9rem] leading-none font-black">
                <span key={`b${match.blue.score}`} className="pop inline-block text-blue">
                    {match.blue.score}
                </span>
                <span className="text-[0.45em] text-text-3">–</span>
                <span key={`r${match.red.score}`} className="pop inline-block text-red">
                    {match.red.score}
                </span>
            </div>
            <div className="grid grid-cols-2 gap-[1.4rem]">
                <Players team={match.blue} side="blue" />
                <Players team={match.red} side="red" />
            </div>
        </section>
    );
}

function Players({ team, side }: { team: LiveTeam; side: 'blue' | 'red' }) {
    return (
        <ul
            className={`flex min-w-0 flex-col gap-[0.9rem] ${side === 'red' ? 'items-end text-right' : ''}`}
        >
            {team.players.map((p) => (
                <li
                    key={p.id}
                    className={`flex max-w-full items-center gap-[0.8rem] ${side === 'red' ? 'flex-row-reverse' : ''}`}
                >
                    <Avatar
                        name={p.name}
                        url={p.avatarUrl}
                        className="size-[3rem] text-[1.1rem]"
                        ring={
                            side === 'blue'
                                ? 'ring-[0.2rem] ring-blue/70'
                                : 'ring-[0.2rem] ring-red/70'
                        }
                    />
                    <div className={`flex min-w-0 flex-col ${side === 'red' ? 'items-end' : ''}`}>
                        <span className="max-w-full truncate text-[1.7rem] font-semibold">
                            {p.name}
                        </span>
                        {p.change && (
                            <Delta value={p.change.elo} unit="Elo" className="text-[1.1rem]" />
                        )}
                    </div>
                </li>
            ))}
            {team.players.length === 0 && (
                <li className="text-[1.5rem] text-text-3">Picking teams…</li>
            )}
        </ul>
    );
}
