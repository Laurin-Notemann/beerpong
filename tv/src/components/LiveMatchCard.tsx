import { Avatar } from '~/components/Avatar';
import { CupRack } from '~/components/CupRack';
import { useNow } from '~/lib/hooks';
import { formatElapsed } from '~/lib/liveMatch';
import type { LiveMatchView, LiveTeam } from '~/server/board';

export type CardSize = 'lg' | 'md' | 'sm';

const sizes = {
    lg: {
        score: 'text-[11rem]',
        rack: 'w-[17rem]',
        name: 'text-[2.6rem]',
        avatar: 'size-[4.5rem] text-[1.6rem]',
        pad: 'p-10 gap-8',
    },
    md: {
        score: 'text-[7.5rem]',
        rack: 'w-[11rem]',
        name: 'text-[2rem]',
        avatar: 'size-[3.2rem] text-[1.2rem]',
        pad: 'p-7 gap-6',
    },
    sm: {
        score: 'text-[5.2rem]',
        rack: 'w-[8rem]',
        name: 'text-[1.6rem]',
        avatar: 'size-[2.6rem] text-[1rem]',
        pad: 'px-7 py-5 gap-5',
    },
} satisfies Record<CardSize, Record<string, string>>;

/** one live match: both racks, the players and the score, blue on the left as in the app */
export function LiveMatchCard({
    match,
    size,
    className = '',
}: {
    match: LiveMatchView;
    size: CardSize;
    className?: string;
}) {
    const now = useNow();
    const s = sizes[size];
    const elapsed = match.startedAt ? formatElapsed(now - Date.parse(match.startedAt)) : '';

    return (
        <section
            className={`rise relative flex flex-col rounded-[2rem] border border-line bg-panel ${s.pad} ${className}`}
        >
            <div className="flex items-center gap-3 text-[1.4rem] font-semibold">
                <span className="live-dot size-[0.9rem] rounded-full bg-live" />
                <span className="tracking-[0.18em] text-live">LIVE</span>
                <span className="tabular text-text-2">{elapsed}</span>
            </div>
            <div className="flex min-h-0 flex-1 items-center gap-[2rem]">
                <CupRack cups={match.blue.cups} team="blue" className={`${s.rack} shrink-0`} />
                <Players team={match.blue} side="blue" size={size} />
                <div
                    className={`tabular flex shrink-0 items-center gap-[1.5rem] font-black leading-none ${s.score}`}
                >
                    <span key={`b${match.blue.score}`} className="pop inline-block text-blue">
                        {match.blue.score}
                    </span>
                    <span className="text-text-3 text-[0.5em]">–</span>
                    <span key={`r${match.red.score}`} className="pop inline-block text-red">
                        {match.red.score}
                    </span>
                </div>
                <Players team={match.red} side="red" size={size} />
                <CupRack cups={match.red.cups} team="red" className={`${s.rack} shrink-0`} />
            </div>
        </section>
    );
}

function Players({ team, side, size }: { team: LiveTeam; side: 'blue' | 'red'; size: CardSize }) {
    const s = sizes[size];
    return (
        <ul
            className={`flex min-w-0 flex-1 flex-col gap-[0.8rem] ${side === 'blue' ? 'items-end text-right' : 'items-start'}`}
        >
            {team.players.map((p) => (
                <li
                    key={p.id}
                    className={`flex max-w-full items-center gap-[0.8rem] ${side === 'blue' ? 'flex-row-reverse' : ''}`}
                >
                    <Avatar
                        name={p.name}
                        url={p.avatarUrl}
                        className={s.avatar}
                        ring={
                            side === 'blue'
                                ? 'ring-[0.2rem] ring-blue/70'
                                : 'ring-[0.2rem] ring-red/70'
                        }
                    />
                    <span className={`truncate font-semibold ${s.name}`}>{p.name}</span>
                </li>
            ))}
            {team.players.length === 0 && (
                <li className={`text-text-3 ${s.name}`}>Picking teams…</li>
            )}
        </ul>
    );
}
