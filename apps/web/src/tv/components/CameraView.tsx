import { TOURNAMENT_COLOR } from '@/lib/tournament';
import {
    type CameraCorner,
    type CameraRotation,
    type DisplayConfig,
    cameraPositionLabel,
    cameraSubjectLabel,
} from '@/lib/tvDisplay';
import type { VisionHitDto } from '@/openapi/openapi';
import { Avatar } from '~/tv/components/Avatar';
import { CameraVideo } from '~/tv/components/CameraVideo';
import { CupRack } from '~/tv/components/CupRack';
import { Delta, RankMove } from '~/tv/components/Leaderboard';
import { TournamentIcon } from '~/tv/components/TournamentIcon';
import { useNow } from '~/tv/lib/hooks';
import { formatElapsed } from '~/tv/lib/liveMatch';
import type { LiveMatchView, LiveTeam } from '~/tv/server/board';

const shade = (to: 'top' | 'bottom') => ({
    background: `linear-gradient(to ${to}, rgba(0,0,0,0.75), rgba(0,0,0,0))`,
});

/**
 * A camera's video on the whole screen (lib/cameraFeed.ts), with the match over it like on
 * television: the group at the top, the latest cup hit in the corner, both teams with their
 * racks and the score at the bottom. The remote can swap the sides to match the table.
 */
export function CameraView({
    stream,
    status,
    match,
    groupName,
    offline,
    flipped = false,
    videoFlipped = false,
    videoFlippedVertically = false,
    rotation = 0,
    cameraId,
    corners,
    hit,
    suspended = false,
}: {
    stream: MediaStream | null;
    /** shown while there's no video yet; the TV shows it in its header instead */
    status?: string;
    match: LiveMatchView | undefined;
    groupName: string;
    offline: boolean;
    flipped?: boolean;
    videoFlipped?: boolean;
    videoFlippedVertically?: boolean;
    rotation?: CameraRotation;
    cameraId: string;
    hit?: VisionHitDto | null;
    suspended?: boolean;
    corners: (CameraCorner & {
        stream: MediaStream | null;
        status: string;
        config: DisplayConfig;
    })[];
}) {
    return (
        <div className="relative h-screen overflow-hidden bg-black">
            {stream && (
                <CameraVideo
                    stream={stream}
                    flipped={videoFlipped}
                    verticallyFlipped={videoFlippedVertically}
                    rotation={rotation}
                    cameraId={cameraId}
                    hit={hit}
                    suspended={suspended}
                />
            )}
            {!stream && status && (
                <div
                    role="status"
                    className="absolute inset-0 flex items-center justify-center px-[4rem] text-center text-[2rem] text-text-2"
                >
                    {status}
                </div>
            )}
            {corners.map((corner) => (
                <section
                    key={corner.position}
                    aria-label={`${cameraPositionLabel[corner.position]} camera`}
                    className="absolute z-20 overflow-hidden rounded-[1rem] bg-black shadow-xl"
                    style={{
                        width: `${corner.width}%`,
                        height: `${corner.width}%`,
                        ...(corner.position.startsWith('top') ? { top: 0 } : { bottom: 0 }),
                        ...(corner.position.endsWith('left') ? { left: 0 } : { right: 0 }),
                        outline: '1px solid rgba(255,255,255,0.1)',
                    }}
                >
                    {corner.stream ? (
                        <CameraVideo
                            stream={corner.stream}
                            flipped={corner.config.cameraVideoFlipped}
                            verticallyFlipped={corner.config.cameraVideoFlippedVertically}
                            rotation={corner.config.cameraRotation}
                            cameraId={corner.cameraId}
                            suspended={suspended}
                            hit={hit?.cameraId === corner.cameraId ? hit : null}
                        />
                    ) : (
                        <div
                            role="status"
                            className="absolute inset-0 flex items-center justify-center p-[1rem] text-center text-[1rem] text-text-2"
                        >
                            {corner.status}
                        </div>
                    )}
                    <span className="absolute bottom-0 left-0 rounded-tr-[0.6rem] bg-black/70 px-[0.6rem] py-[0.3rem] text-[1rem] font-semibold">
                        {cameraSubjectLabel[corner.subject]}
                    </span>
                </section>
            ))}
            <header
                className="absolute top-0 right-0 left-0 z-30 flex items-start gap-[2rem] px-[2.5rem] pt-[2rem] pb-[6rem]"
                style={shade('bottom')}
            >
                <div className="min-w-0 flex-1">
                    <div className="text-[1.2rem] font-semibold tracking-[0.3em] text-text-2">
                        VERSUS
                    </div>
                    <h1 className="truncate text-[2.6rem] leading-tight font-black">{groupName}</h1>
                    {match?.tournamentStage && (
                        <div
                            className="flex items-center gap-2 text-[1.4rem]"
                            style={{ color: TOURNAMENT_COLOR }}
                        >
                            <TournamentIcon size={20} />
                            {match.tournamentStage}
                        </div>
                    )}
                    {offline && <div className="text-[1.4rem] text-red">Reconnecting…</div>}
                </div>
                {match?.moves[0] && (
                    <LatestMove key={match.moves.length} match={match} flipped={flipped} />
                )}
            </header>
            {match ? (
                <ScoreBar
                    match={match}
                    flipped={flipped}
                    videoFlipped={videoFlipped}
                    hit={hit?.liveMatchId === match.id ? hit : null}
                />
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
function LatestMove({ match, flipped }: { match: LiveMatchView; flipped: boolean }) {
    const m = match.moves[0];
    const left = flipped ? 'red' : 'blue';
    const right = flipped ? 'blue' : 'red';
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
                <span
                    className={
                        m.team === left
                            ? left === 'blue'
                                ? 'text-blue'
                                : 'text-red'
                            : 'text-text-3'
                    }
                >
                    {m[left]}
                </span>
                <span className="text-text-3"> – </span>
                <span
                    className={
                        m.team === right
                            ? right === 'blue'
                                ? 'text-blue'
                                : 'text-red'
                            : 'text-text-3'
                    }
                >
                    {m[right]}
                </span>
            </span>
        </div>
    );
}

/** the complete scoreboard sides swap; the camera video and match data stay as recorded */
function ScoreBar({
    match,
    flipped,
    videoFlipped,
    hit,
}: {
    match: LiveMatchView;
    flipped: boolean;
    videoFlipped: boolean;
    hit?: VisionHitDto | null;
}) {
    const left = flipped ? 'red' : 'blue';
    const right = flipped ? 'blue' : 'red';
    const now = useNow();
    const elapsed = match.startedAt ? formatElapsed(now - Date.parse(match.startedAt)) : '';

    return (
        <div
            className="absolute right-0 bottom-0 left-0 z-30 flex flex-col items-center gap-[0.8rem] px-[2.5rem] pt-[8rem] pb-[6rem]"
            style={shade('top')}
        >
            <div className="flex items-center gap-[0.8rem] text-[1.3rem] font-semibold">
                <span className="live-dot size-[0.8rem] rounded-full bg-live" />
                <span className="tracking-[0.18em] text-live">LIVE</span>
                <span className="tabular text-text-2">{elapsed}</span>
            </div>
            {hit && (
                <div
                    role="status"
                    className="rounded-full bg-black/80 px-5 py-2 text-[1.5rem] font-bold"
                    style={{ color: '#ffe27a' }}
                >
                    Possible hit · {hit.team === 'blue' ? 'Blue' : 'Red'} target
                    {hit.cup ? ` · cup ${hit.cup.x},${hit.cup.y}` : ' · cup identity unknown'}
                </div>
            )}
            <div className="flex w-full items-center gap-[2rem]">
                <CupRack
                    cups={match[left].cups}
                    cameraMirrored={videoFlipped}
                    highlight={hit?.team === left ? hit.cup : null}
                    team={left}
                    side="left"
                    className="w-[8rem] shrink-0"
                />
                <Players team={match[left]} side={left} align="left" />
                <div className="tabular flex shrink-0 items-center gap-[1.2rem] text-[7rem] leading-none font-black">
                    <span
                        key={`${left}${match[left].score}`}
                        className={`pop inline-block ${left === 'blue' ? 'text-blue' : 'text-red'}`}
                    >
                        {match[left].score}
                    </span>
                    <span className="text-[0.5em] text-text-3">–</span>
                    <span
                        key={`${right}${match[right].score}`}
                        className={`pop inline-block ${right === 'blue' ? 'text-blue' : 'text-red'}`}
                    >
                        {match[right].score}
                    </span>
                </div>
                <Players team={match[right]} side={right} align="right" />
                <CupRack
                    cups={match[right].cups}
                    cameraMirrored={videoFlipped}
                    highlight={hit?.team === right ? hit.cup : null}
                    team={right}
                    side="right"
                    className="w-[8rem] shrink-0"
                />
            </div>
        </div>
    );
}

/** a team's players, towards the score, with the Elo the match gives them if it ended now */
function Players({
    team,
    side,
    align,
}: {
    team: LiveTeam;
    side: 'blue' | 'red';
    align: 'left' | 'right';
}) {
    return (
        <ul
            className={`flex min-w-0 flex-1 flex-col gap-[0.6rem] ${align === 'left' ? 'items-end' : 'items-start'}`}
        >
            {team.players.map((p) => (
                <li
                    key={p.id}
                    className={`flex max-w-full items-center gap-[1rem] ${align === 'left' ? 'flex-row-reverse' : ''}`}
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
                    <div className={`min-w-0 ${align === 'left' ? 'text-right' : ''}`}>
                        <div className="truncate text-[2.4rem] font-bold">{p.name}</div>
                        <div
                            className={`tabular flex items-center gap-[0.8rem] whitespace-nowrap text-[1.4rem] ${align === 'left' ? 'justify-end' : ''}`}
                        >
                            <span className="font-semibold">{p.points ?? 0} pts</span>
                            <span className="text-text-2">
                                {p.standing && !p.standing.unranked
                                    ? `${p.standing.tied ? 'T' : '#'}${p.standing.rank}`
                                    : 'Unranked'}
                            </span>
                            {p.change && <RankMove places={p.change.rank} />}
                            {p.change && <Delta value={p.change.elo} unit="Elo" />}
                        </div>
                    </div>
                </li>
            ))}
            {team.players.length === 0 && (
                <li className="text-[2rem] text-text-3">Picking teams…</li>
            )}
        </ul>
    );
}
