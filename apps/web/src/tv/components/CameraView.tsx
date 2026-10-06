import { useEffect, useRef } from 'react';

import { Avatar } from '~/tv/components/Avatar';
import { CupRack } from '~/tv/components/CupRack';
import { Delta } from '~/tv/components/Leaderboard';
import { useNow } from '~/tv/lib/hooks';
import { formatElapsed } from '~/tv/lib/liveMatch';
import type { LiveMatchView, LiveTeam } from '~/tv/server/board';

const shade = (to: 'top' | 'bottom') => ({
    background: `linear-gradient(to ${to}, rgba(0,0,0,0.75), rgba(0,0,0,0))`,
});

/**
 * A camera's video on the whole screen (lib/cameraFeed.ts), with the match over it like on
 * television: the group at the top, the latest cup hit in the corner, both teams with their
 * racks and the score at the bottom. Without a live match only the group shows.
 */
export function CameraView({
    stream,
    suspended = false,
    match,
    groupName,
    offline,
}: {
    stream: MediaStream;
    /** The Samsung decoder goes to the score clip until the board covers it again. */
    suspended?: boolean;
    match: LiveMatchView | undefined;
    groupName: string;
    offline: boolean;
}) {
    const video = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const v = video.current!;
        if (!suspended) {
            v.srcObject = stream;
            v.play().catch(() => {});
        }
        return () => {
            v.pause();
            v.srcObject = null;
            v.load();
        };
    }, [stream, suspended]);

    return (
        <div className="relative h-screen overflow-hidden bg-black">
            <video
                ref={video}
                muted
                autoPlay
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
            />
            <header
                className="absolute top-0 right-0 left-0 flex items-start gap-[2rem] px-[2.5rem] pt-[2rem] pb-[6rem]"
                style={shade('bottom')}
            >
                <div className="min-w-0 flex-1">
                    <div className="text-[1.2rem] font-semibold tracking-[0.3em] text-text-2">
                        VERSUS
                    </div>
                    <h1 className="truncate text-[2.6rem] leading-tight font-black">{groupName}</h1>
                    {offline && <div className="text-[1.4rem] text-red">Reconnecting…</div>}
                </div>
                {match?.moves[0] && <LatestMove key={match.moves.length} match={match} />}
            </header>
            {match ? (
                <ScoreBar match={match} />
            ) : (
                <div
                    className="absolute right-0 bottom-0 left-0 px-[2.5rem] pt-[6rem] pb-[2.5rem] text-[2rem] text-text-2"
                    style={shade('top')}
                >
                    No match running
                </div>
            )}
        </div>
    );
}

/** the cup hit just now: who, with which move, and the score after it */
function LatestMove({ match }: { match: LiveMatchView }) {
    const m = match.moves[0];
    return (
        <div className="rise flex shrink-0 items-center gap-[1.2rem] rounded-[1.6rem] bg-panel/80 px-[1.6rem] py-[1rem]">
            <Avatar name={m.name} url={m.avatarUrl} className="size-[3.6rem] text-[1.4rem]" />
            <span
                className={`text-[2rem] font-bold ${m.team === 'blue' ? 'text-blue' : 'text-red'}`}
            >
                {m.name}
            </span>
            <span className="text-[1.8rem] text-text-2">{m.move}</span>
            <span className="tabular text-[2.2rem] font-extrabold">
                <span className={m.team === 'blue' ? 'text-blue' : 'text-text-3'}>{m.blue}</span>
                <span className="text-text-3"> – </span>
                <span className={m.team === 'red' ? 'text-red' : 'text-text-3'}>{m.red}</span>
            </span>
        </div>
    );
}

/** both teams and the score along the bottom, blue on the left as everywhere on the TV */
function ScoreBar({ match }: { match: LiveMatchView }) {
    const now = useNow();
    const elapsed = match.startedAt ? formatElapsed(now - Date.parse(match.startedAt)) : '';

    return (
        <div
            className="absolute right-0 bottom-0 left-0 flex flex-col items-center gap-[0.8rem] px-[2.5rem] pt-[8rem] pb-[2.5rem]"
            style={shade('top')}
        >
            <div className="flex items-center gap-[0.8rem] text-[1.3rem] font-semibold">
                <span className="live-dot size-[0.8rem] rounded-full bg-live" />
                <span className="tracking-[0.18em] text-live">LIVE</span>
                <span className="tabular text-text-2">{elapsed}</span>
            </div>
            <div className="flex w-full items-center gap-[2rem]">
                <CupRack cups={match.blue.cups} team="blue" className="w-[8rem] shrink-0" />
                <Players team={match.blue} side="blue" />
                <div className="tabular flex shrink-0 items-center gap-[1.2rem] text-[7rem] leading-none font-black">
                    <span key={`b${match.blue.score}`} className="pop inline-block text-blue">
                        {match.blue.score}
                    </span>
                    <span className="text-[0.5em] text-text-3">–</span>
                    <span key={`r${match.red.score}`} className="pop inline-block text-red">
                        {match.red.score}
                    </span>
                </div>
                <Players team={match.red} side="red" />
                <CupRack cups={match.red.cups} team="red" className="w-[8rem] shrink-0" />
            </div>
        </div>
    );
}

/** a team's players, towards the score, with the Elo the match gives them if it ended now */
function Players({ team, side }: { team: LiveTeam; side: 'blue' | 'red' }) {
    return (
        <ul
            className={`flex min-w-0 flex-1 flex-col gap-[0.6rem] ${side === 'blue' ? 'items-end' : 'items-start'}`}
        >
            {team.players.map((p) => (
                <li
                    key={p.id}
                    className={`flex max-w-full items-center gap-[1rem] ${side === 'blue' ? 'flex-row-reverse' : ''}`}
                >
                    <Avatar
                        name={p.name}
                        url={p.avatarUrl}
                        className="size-[4rem] text-[1.4rem]"
                        ring={
                            side === 'blue'
                                ? 'ring-[0.2rem] ring-blue/70'
                                : 'ring-[0.2rem] ring-red/70'
                        }
                    />
                    <span className="truncate text-[2.4rem] font-bold">{p.name}</span>
                    {p.change && (
                        <Delta value={p.change.elo} unit="Elo" className="text-[1.4rem]" />
                    )}
                </li>
            ))}
            {team.players.length === 0 && (
                <li className="text-[2rem] text-text-3">Picking teams…</li>
            )}
        </ul>
    );
}
