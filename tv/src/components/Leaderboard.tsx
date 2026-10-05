import { Avatar } from '~/components/Avatar';
import type { LeaderboardRow } from '~/server/board';

const medal = ['text-gold', 'text-[#c9d1d9]', 'text-[#d08b5b]'];

const rankLabel = (row: LeaderboardRow) =>
    row.unranked ? '–' : `${row.tied ? 'T' : ''}${row.rank}`;

/** a leaderboard list; `compact` is the column next to live matches */
export function LeaderboardList({
    rows,
    compact,
    className = '',
    style,
}: {
    rows: LeaderboardRow[];
    compact?: boolean;
    className?: string;
    style?: React.CSSProperties;
}) {
    return (
        <ol
            className={`flex flex-col ${compact ? 'gap-[0.6rem]' : 'gap-[0.8rem]'} ${className}`}
            style={style}
        >
            {rows.map((row, idx) => (
                <li
                    key={row.id}
                    style={{ animationDelay: `${idx * 30}ms` }}
                    className={`rise flex items-center rounded-[1.2rem] bg-panel ${compact ? 'gap-[1rem] px-[1.2rem] py-[0.7rem]' : 'gap-[1.4rem] px-[1.6rem] py-[1rem]'} ${row.unranked ? 'opacity-55' : ''}`}
                >
                    <span
                        className={`tabular w-[3.2rem] shrink-0 text-center font-bold ${compact ? 'text-[1.6rem]' : 'text-[2rem]'} ${!row.unranked && row.rank <= 3 ? medal[row.rank - 1] : 'text-text-2'}`}
                    >
                        {rankLabel(row)}
                    </span>
                    <Avatar
                        name={row.name}
                        url={row.avatarUrl}
                        className={
                            compact ? 'size-[2.8rem] text-[1.1rem]' : 'size-[3.4rem] text-[1.3rem]'
                        }
                    />
                    <div className="min-w-0 flex-1">
                        <div
                            className={`truncate font-semibold ${compact ? 'text-[1.6rem]' : 'text-[2rem]'}`}
                        >
                            {row.name}
                        </div>
                        {!compact && (
                            <div className="tabular text-[1.2rem] text-text-3">
                                {row.matches} {row.matches === 1 ? 'match' : 'matches'} · {row.wins}{' '}
                                won
                            </div>
                        )}
                    </div>
                    <span
                        className={`tabular shrink-0 font-bold ${compact ? 'text-[1.8rem]' : 'text-[2.3rem]'}`}
                    >
                        {row.value}
                    </span>
                </li>
            ))}
        </ol>
    );
}

/** the top three on a podium: first in the middle, raised */
export function Podium({ rows }: { rows: LeaderboardRow[] }) {
    const order = [rows[1], rows[0], rows[2]];
    const heights = ['h-[8.5rem]', 'h-[10.5rem]', 'h-[7rem]'];

    return (
        <div className="flex items-end justify-center gap-[2rem]">
            {order.map((row, idx) =>
                row ? (
                    <div
                        key={row.id}
                        className="rise flex w-[18rem] flex-col items-center gap-[1rem]"
                        style={{ animationDelay: `${idx * 80}ms` }}
                    >
                        <Avatar
                            name={row.name}
                            url={row.avatarUrl}
                            className={
                                idx === 1
                                    ? 'size-[7rem] text-[2.6rem]'
                                    : 'size-[5.6rem] text-[2rem]'
                            }
                            ring={`ring-[0.3rem] ${idx === 1 ? 'ring-gold' : 'ring-line'}`}
                        />
                        <div className="max-w-full truncate text-[1.9rem] font-semibold">
                            {row.name}
                        </div>
                        <div
                            className={`flex w-full flex-col items-center justify-start rounded-t-[1.4rem] bg-panel pt-[0.8rem] ${heights[idx]}`}
                        >
                            <span
                                className={`text-[2.4rem] leading-tight font-black ${medal[row.rank - 1] ?? 'text-text-2'}`}
                            >
                                {row.tied ? 'T' : ''}
                                {row.rank}
                            </span>
                            <span className="tabular text-[1.7rem] font-bold text-text-2">
                                {row.value}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div key={idx} className="w-[18rem]" />
                )
            )}
        </div>
    );
}
