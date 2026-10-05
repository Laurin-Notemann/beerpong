import { useEffect, useState } from 'react';

import { Avatar } from '~/components/Avatar';
import { useFlip } from '~/lib/useFlip';
import type { LeaderboardRow } from '~/server/board';

const medal = ['text-gold', 'text-[#c9d1d9]', 'text-[#d08b5b]'];

const rankLabel = (row: LeaderboardRow) =>
    row.unranked ? '–' : `${row.tied ? 'T' : ''}${row.rank}`;

/** a signed change, green up, red down; nothing for zero */
export function Delta({
    value,
    unit,
    className = '',
}: {
    value: number;
    unit?: string;
    className?: string;
}) {
    const rounded = Math.round(value);
    if (!rounded) return null;
    return (
        <span
            className={`tabular rounded-full px-[0.7em] py-[0.15em] font-bold ${rounded > 0 ? 'bg-live/15 text-live' : 'bg-red/15 text-red'} ${className}`}
        >
            {rounded > 0 ? '+' : '−'}
            {Math.abs(rounded)}
            {unit && <span className="font-semibold opacity-80"> {unit}</span>}
        </span>
    );
}

/** places gained or lost, as an arrow */
export function RankMove({ places, className = '' }: { places: number; className?: string }) {
    if (!places) return null;
    return (
        <span className={`tabular font-bold ${places > 0 ? 'text-live' : 'text-red'} ${className}`}>
            {places > 0 ? '▲' : '▼'}
            {Math.abs(places)}
        </span>
    );
}

/**
 * A leaderboard list. Players in a live match show what it does to them if it ended now, and
 * rows slide to their new rank as the match goes on. `compact` is the narrow column.
 */
export function LeaderboardList({
    rows,
    compact,
    fill,
    className = '',
    style,
}: {
    rows: LeaderboardRow[];
    compact?: boolean;
    /** rows share the list's height */
    fill?: boolean;
    className?: string;
    style?: React.CSSProperties;
}) {
    const ref = useFlip<HTMLOListElement>([rows.map((i) => i.id).join()]);
    // rows rise in once; later they slide (an animation would restart when a row moves)
    const [entered, setEntered] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setEntered(true), 1_000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <ol
            ref={ref}
            className={`flex flex-col ${compact ? 'gap-[0.6rem]' : 'gap-[0.8rem]'} ${className}`}
            style={style}
        >
            {rows.map((row, idx) => (
                <li
                    key={row.id}
                    data-flip={row.id}
                    style={{ animationDelay: `${idx * 30}ms` }}
                    className={`${entered ? '' : 'rise'} ${fill ? 'max-h-[7rem] min-h-0 flex-1' : ''} flex items-center rounded-[1.2rem] border ${row.change ? 'border-live/50 bg-live/[0.07]' : 'border-transparent bg-panel'} ${compact ? 'gap-[1rem] px-[1.2rem] py-[0.7rem]' : 'gap-[1.4rem] px-[1.6rem] py-[0.9rem]'} ${row.unranked ? 'opacity-55' : ''}`}
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
                            className={`flex items-center gap-[0.6rem] font-semibold ${compact ? 'text-[1.6rem]' : 'text-[2rem]'}`}
                        >
                            <span className="truncate">{row.name}</span>
                            {row.change && (
                                <span className="live-dot size-[0.6em] shrink-0 rounded-full bg-live" />
                            )}
                        </div>
                        {!compact && (
                            <div className="tabular text-[1.2rem] text-text-3">
                                {row.matches} {row.matches === 1 ? 'match' : 'matches'} · {row.wins}{' '}
                                won
                            </div>
                        )}
                    </div>
                    {row.change && (
                        <div
                            className={`flex shrink-0 items-center gap-[0.6rem] ${compact ? 'text-[1.1rem]' : 'text-[1.3rem]'}`}
                        >
                            <RankMove places={row.change.rank} />
                            <Delta value={row.change.points} unit="pts" />
                            <Delta value={row.change.elo} unit="Elo" />
                        </div>
                    )}
                    <span
                        className={`tabular w-[5.5rem] shrink-0 text-right font-bold ${compact ? 'text-[1.8rem]' : 'text-[2.3rem]'}`}
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
