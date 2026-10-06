import { createFileRoute } from '@tanstack/react-router';
import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';

import { CameraView } from '~/tv/components/CameraView';
import { FocusView } from '~/tv/components/FocusView';
import { FullscreenButton } from '~/tv/components/FullscreenButton';
import { LeaderboardList, Podium } from '~/tv/components/Leaderboard';
import { type CardSize, LiveMatchCard } from '~/tv/components/LiveMatchCard';
import { LiveMatchPanel } from '~/tv/components/LiveMatchPanel';
import { boardScale, ScoreClipPanel } from '~/tv/components/ScoreClipPanel';
import {
    type DisplayConfig,
    emptyConfig,
    layoutFor,
    parseConfig,
    pickMatches,
} from '@/lib/tvDisplay';
import { useCameraFeed } from '~/tv/lib/cameraFeed';
import { type DisplayEvent, randomToken, useBoard, useDisplayEvents, useNow } from '~/tv/lib/hooks';
import {
    hasSingleVideoDecoder,
    liveScoreClips,
    type ScoreClip,
    scoreClipsOf,
} from '~/tv/lib/scoreClips';
import type { Board, LeaderboardRow } from '~/tv/server/board';
import { registerDisplay } from '~/tv/server/functions';

/** The TV: what's on it comes from the app's TV remote, which adds it with the code it shows. */
export const Route = createFileRoute('/tv/')({
    // everything here depends on this browser's identity in localStorage
    ssr: false,
    component: Tv,
});

interface Identity {
    id: string;
    secret: string;
    /** what it shows to be added in the app; the server hands it out on the first register */
    code: string | null;
    config: DisplayConfig;
    refreshToken: string | null;
}

const STORAGE_KEY = 'versus-tv';

function loadIdentity(): Identity {
    try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '');
        if (stored?.id && stored?.secret) {
            return {
                ...stored,
                code: stored.code ?? null,
                config: parseConfig(stored.config),
                refreshToken: stored.refreshToken ?? null,
            };
        }
    } catch {
        // first start, or something unreadable: start over
    }
    return {
        id: randomToken(),
        secret: randomToken(24),
        code: null,
        config: emptyConfig,
        refreshToken: null,
    };
}

function Tv() {
    const [identity, setIdentity] = useState(loadIdentity);
    const [registered, setRegistered] = useState(false);

    useEffect(() => {
        document.documentElement.classList.add('tv');
        return () => document.documentElement.classList.remove('tv');
    }, []);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
    }, [identity]);

    const register = useCallback(async () => {
        const { id, secret, code, config, refreshToken } = identity;
        const res = await registerDisplay({
            data: { kind: 'tv', id, secret, code, config, refreshToken },
        });
        setIdentity((i) => ({ ...i, code: res.code, config: res.config }));
        setRegistered(true);
    }, [identity]);

    // registers once (until it works); the events stream registers again when it loses the server
    useEffect(() => {
        let stopped = false;
        const attempt = () =>
            register().catch(() => {
                if (!stopped) setTimeout(attempt, 3_000);
            });
        attempt();
        return () => {
            stopped = true;
        };
    }, []);

    // the Camera view's video, from the camera the app picked (lib/cameraFeed.ts)
    const feed = useCameraFeed(
        identity.id,
        identity.secret,
        registered && !!identity.config.groupId && identity.config.view === 'camera',
        identity.config.groupId,
        identity.config.cameraId
    );
    const onFeedSignal = useRef(feed.onSignal);
    onFeedSignal.current = feed.onSignal;

    const onEvent = useCallback((event: DisplayEvent) => {
        if (event.type === 'reload') return location.reload();
        if (event.type === 'signal') return void onFeedSignal.current(event.from, event.signal);
        if (event.type === 'config') setIdentity((i) => ({ ...i, config: event.config }));
        if (event.type === 'session') {
            setIdentity((i) => ({ ...i, refreshToken: event.refreshToken }));
        }
    }, []);

    const connected = useDisplayEvents(
        registered ? identity.id : undefined,
        identity.secret,
        onEvent,
        register
    );
    // every score with a clip queues it; they play one after another
    const [clips, setClips] = useState<ScoreClip[]>([]);
    const liveMatches = useRef<Board['liveMatches']>([]);
    const board = useBoard(
        identity.id,
        identity.secret,
        registered ? identity.config : undefined,
        (event) => {
            const scored = scoreClipsOf(event, liveMatches.current);
            if (scored.length) setClips((queue) => [...queue, ...scored]);
        }
    );
    liveMatches.current = pickMatches(board.data?.liveMatches ?? [], [
        ...(identity.config.focusMatchId ? [identity.config.focusMatchId] : []),
        ...identity.config.pinnedMatchIds.filter((id) => id !== identity.config.focusMatchId),
    ]);
    const readyClips = liveScoreClips(liveMatches.current);
    const clipKeys = JSON.stringify(readyClips.map((clip) => clip.key));
    useEffect(() => {
        const keys = new Set<string>(JSON.parse(clipKeys));
        setClips((queue) => queue.filter((clip) => keys.has(clip.key)));
    }, [clipKeys]);
    const clipDone = useCallback(() => setClips((queue) => queue.slice(1)), []);

    const { config } = identity;

    return (
        <>
            {config.groupId ? (
                <Screen
                    board={board.data ?? null}
                    config={config}
                    offline={!connected || board.isError}
                    feed={feed.stream}
                    cameraStatus={feed.status}
                    readyClips={readyClips}
                    clip={clips.find((clip) => readyClips.some((ready) => ready.key === clip.key))}
                    onClipDone={clipDone}
                />
            ) : (
                <Pairing code={identity.code} />
            )}
            {/* it sits in the corner a clip from the right plays in */}
            {!clips.length && <FullscreenButton />}
        </>
    );
}

/** before the app put a group on it: the code to add it with */
function Pairing({ code }: { code: string | null }) {
    return (
        <main className="grid h-screen place-items-center">
            <div className="rise flex max-w-[80rem] flex-col items-center gap-[3rem] text-center">
                <div className="text-[2rem] font-semibold tracking-[0.3em] text-text-3">
                    VERSUS TV
                </div>
                <h1 className="text-[5.4rem] leading-[1.05] font-black">
                    Put your group on this screen
                </h1>
                <div className="tabular rounded-[2rem] bg-panel px-[4rem] py-[2rem] text-[12rem] leading-none font-black tracking-[0.2em]">
                    {code ?? '······'}
                </div>
                <p className="text-[2.2rem] text-text-2">
                    In the Versus app, open Settings → TV Remote → Add TV and enter this code.
                </p>
            </div>
        </main>
    );
}

function Screen({
    board,
    config,
    offline,
    feed,
    cameraStatus,
    readyClips,
    clip,
    onClipDone,
}: {
    board: Board | null;
    config: DisplayConfig;
    offline: boolean;
    /** the camera's video, while it comes in */
    feed: MediaStream | null;
    cameraStatus: string;
    readyClips: Omit<ScoreClip, 'id'>[];
    clip: ScoreClip | undefined;
    onClipDone: () => void;
}) {
    const live = board?.liveMatches ?? [];
    const matches = pickMatches(live, config.pinnedMatchIds);
    const liveIds = live.map((i) => i.id);
    const wanted = layoutFor(config, liveIds);
    // until the camera's video comes in, what auto shows
    const layout =
        wanted === 'camera' && !feed ? layoutFor({ ...config, view: 'auto' }, liveIds) : wanted;
    const focused = live.find((i) => i.id === config.focusMatchId);
    const rows = board?.leaderboard.rows ?? [];
    // Next to the leaderboard clips use the right column; other views use the team side.
    const singleDecoder = hasSingleVideoDecoder();

    return (
        // the clip waits behind the board, which shrinks aside to show it (`.tv-board` in
        // styles.css); it has to come first for that
        <div
            className="relative h-screen overflow-hidden"
            style={clip && ({ '--board-scale': boardScale() } as CSSProperties)}
        >
            {readyClips.map((ready) => (
                <ScoreClipPanel
                    key={ready.key}
                    clip={ready}
                    playId={clip?.key === ready.key ? clip.id : undefined}
                    from={
                        layout === 'split' ||
                        (layout === 'camera' && config.cameraOverlayFlipped
                            ? ready.team === 'blue'
                            : ready.team === 'red')
                            ? 'right'
                            : 'left'
                    }
                    singleDecoder={singleDecoder}
                    onDone={onClipDone}
                />
            ))}
            {layout === 'camera' && feed ? (
                <main className="tv-board relative z-10 h-screen bg-bg">
                    <CameraView
                        stream={feed}
                        suspended={singleDecoder && !!clip}
                        match={focused ?? matches[0]}
                        groupName={board?.group.name ?? config.groupName ?? ''}
                        offline={offline}
                        flipped={config.cameraOverlayFlipped}
                    />
                </main>
            ) : (
                <main className="tv-board relative z-10 flex h-screen flex-col gap-[2rem] bg-bg p-[2.5rem]">
                    <Header
                        board={board}
                        config={config}
                        offline={offline}
                        cameraStatus={wanted === 'camera' ? cameraStatus : null}
                    />
                    {!board ? (
                        <div className="grid flex-1 place-items-center text-[2rem] text-text-3">
                            Loading…
                        </div>
                    ) : layout === 'focus' && focused ? (
                        <FocusView match={focused} />
                    ) : layout === 'split' ? (
                        <div className="flex min-h-0 flex-1 gap-[2.5rem]">
                            <section className="flex min-h-0 flex-[1.45] flex-col gap-[1rem] overflow-hidden">
                                <SectionTitle>
                                    Leaderboard · {board.ranking} · as if it ended now
                                </SectionTitle>
                                <LeaderboardList
                                    rows={withLivePlayers(rows, 8)}
                                    fill
                                    className="min-h-0 flex-1"
                                />
                            </section>
                            <aside className="flex min-h-0 flex-1 flex-col gap-[1.2rem]">
                                <LiveMatchPanel match={matches[0]} className="min-h-0 flex-1" />
                                {live.length > 1 && (
                                    <AlsoLive
                                        matches={live.filter((i) => i.id !== matches[0].id)}
                                    />
                                )}
                            </aside>
                        </div>
                    ) : layout === 'live' ? (
                        matches.length ? (
                            <Matches matches={matches} className="flex-1" />
                        ) : (
                            <Empty>No live matches right now</Empty>
                        )
                    ) : rows.length ? (
                        <div className="flex min-h-0 flex-1 flex-col gap-[2rem]">
                            <Podium rows={rows.slice(0, 3)} />
                            {/* two columns, filled top to bottom: 4 to 8 left, 9 to 13 right */}
                            <LeaderboardList
                                rows={rows.slice(3, 13)}
                                compact
                                className="grid! min-h-0 flex-1 grid-flow-col grid-cols-2 gap-x-[2rem]"
                                style={{
                                    gridTemplateRows: `repeat(${Math.ceil(rows.slice(3, 13).length / 2)}, minmax(0, 4.6rem))`,
                                }}
                            />
                        </div>
                    ) : (
                        <Empty>
                            No matches played {config.scope === 'today' ? 'today' : 'yet'}
                        </Empty>
                    )}
                </main>
            )}
        </div>
    );
}

function Header({
    board,
    config,
    offline,
    cameraStatus,
}: {
    board: Board | null;
    config: DisplayConfig;
    offline: boolean;
    /** the Camera view, before the camera's video comes in */
    cameraStatus: string | null;
}) {
    const now = useNow(10_000);
    const scope =
        config.scope === 'today'
            ? 'Today'
            : config.scope === 'all-time'
              ? 'All time'
              : (board?.season?.name ?? '');

    return (
        <header className="flex items-center gap-[2rem]">
            <div className="min-w-0 flex-1">
                <div className="text-[1.3rem] font-semibold tracking-[0.3em] text-text-3">
                    VERSUS
                </div>
                <h1 className="truncate text-[3.4rem] leading-tight font-black">
                    {board?.group.name ?? config.groupName}
                </h1>
            </div>
            <div className="text-right">
                <div className="text-[1.8rem] font-semibold text-text-2">{scope}</div>
                <div className="tabular text-[1.4rem] text-text-3">
                    {offline ? (
                        <span className="text-red">Reconnecting…</span>
                    ) : cameraStatus ? (
                        <span className="text-text-2">{cameraStatus}</span>
                    ) : (
                        new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    )}
                </div>
            </div>
        </header>
    );
}

/** the Live view's matches: one large, two side by side, three stacked */
function Matches({
    matches,
    className = '',
}: {
    matches: Board['liveMatches'];
    className?: string;
}) {
    const size: CardSize = matches.length === 1 ? 'lg' : matches.length === 2 ? 'md' : 'sm';
    return (
        <div
            className={`flex min-h-0 gap-[1.5rem] ${matches.length > 2 ? 'flex-col' : ''} ${className}`}
        >
            {matches.map((m) => (
                <LiveMatchCard key={m.id} match={m} size={size} className="min-h-0 flex-1" />
            ))}
        </div>
    );
}

/**
 * The first `max` rows, with the players of live matches always among them: if any rank lower,
 * they take the last places, so the table shows what's happening at the tables.
 */
function withLivePlayers(rows: LeaderboardRow[], max: number) {
    const below = rows.slice(max).filter((i) => i.change);
    const top = rows.slice(0, Math.max(0, max - below.length));
    return [...top, ...below.slice(0, max)];
}

/** the other live matches, one line each, under the one next to the leaderboard */
function AlsoLive({ matches }: { matches: Board['liveMatches'] }) {
    const names = (team: Board['liveMatches'][number]['blue']) =>
        team.players.map((p) => p.name).join(' & ') || '…';
    return (
        <div className="flex flex-col gap-[0.6rem]">
            <SectionTitle>Also live</SectionTitle>
            {matches.slice(0, 2).map((m) => (
                <div
                    key={m.id}
                    className="flex items-center gap-[1rem] rounded-[1.2rem] bg-panel px-[1.4rem] py-[0.8rem] text-[1.4rem]"
                >
                    <span className="min-w-0 flex-1 truncate text-blue">{names(m.blue)}</span>
                    <span className="tabular shrink-0 text-[1.8rem] font-black">
                        <span className="text-blue">{m.blue.score}</span>
                        <span className="text-text-3"> – </span>
                        <span className="text-red">{m.red.score}</span>
                    </span>
                    <span className="min-w-0 flex-1 truncate text-right text-red">
                        {names(m.red)}
                    </span>
                </div>
            ))}
            {matches.length > 2 && (
                <div className="text-[1.3rem] text-text-3">and {matches.length - 2} more</div>
            )}
        </div>
    );
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-[1.3rem] font-semibold tracking-[0.2em] text-text-3 uppercase">
        {children}
    </h2>
);

const Empty = ({ children }: { children: React.ReactNode }) => (
    <div className="grid flex-1 place-items-center text-[2.4rem] text-text-3">{children}</div>
);
