import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useState } from 'react';

import {
    byStart,
    type DisplayConfig,
    type DisplayPatch,
    layoutFor,
    MAX_MATCHES,
    pickMatches,
    type Scope,
    type View,
} from '@/lib/tvDisplay';
import { type DisplayEvent, useBoard, useDisplayEvents, useNow } from '~/tv/lib/hooks';
import { formatElapsed } from '~/tv/lib/liveMatch';
import type { LiveMatchView } from '~/tv/server/board';
import { connectGroup, disconnectGroup, reloadDisplay, updateDisplay } from '~/tv/server/functions';

/** The phone's remote for one TV, opened from the TV's QR code (`k` is the TV's control key). */
export const Route = createFileRoute('/tv/remote/$id')({
    ssr: false,
    validateSearch: (search: Record<string, unknown>) => ({
        k: typeof search.k === 'string' ? search.k : '',
    }),
    component: Remote,
});

function Remote() {
    const { id } = Route.useParams();
    const { k: key } = Route.useSearch();
    const [config, setConfig] = useState<DisplayConfig>();

    const onEvent = useCallback((event: DisplayEvent) => {
        if (event.type === 'config') setConfig(event.config);
    }, []);
    // a phone can't bring the TV back; it waits until the TV registers again
    const connected = useDisplayEvents(id, key, onEvent, () => setConfig(undefined));
    const board = useBoard(id, key, config);

    const send = (patch: DisplayPatch) => {
        // shown right away; the TV's echo confirms it
        setConfig((c) => (c ? { ...c, ...patch } : c));
        updateDisplay({ data: { id, key, patch } }).catch(() => {});
    };

    if (!config) {
        return (
            <Page>
                <p className="py-16 text-center text-text-2">
                    {connected
                        ? 'Loading…'
                        : 'Looking for the TV… Is the Versus TV page open on it?'}
                </p>
            </Page>
        );
    }
    if (!config.groupId) {
        return (
            <Page>
                <ConnectGroup id={id} keyValue={key} />
            </Page>
        );
    }

    // in the order they started, so rows don't move under your thumb while cups are hit
    const live = [...(board.data?.liveMatches ?? [])].sort(byStart);
    const liveIds = live.map((i) => i.id);
    // the live matches the TV shows (the first one next to the leaderboard)
    const picked = pickMatches(board.data?.liveMatches ?? [], config.pinnedMatchIds);
    const pinned = config.pinnedMatchIds.filter((i) => liveIds.includes(i));
    const screen: Screen = layoutFor(config, liveIds) === 'focus' ? 'focus' : config.view;

    const choose = (next: Screen) => {
        if (next !== 'focus') send({ view: next, focusMatchId: null });
        // the match the TV shows right now goes on the whole screen
        else if (screen !== 'focus' && picked[0]) send({ focusMatchId: picked[0].id });
    };

    const togglePin = (matchId: string) =>
        send({
            pinnedMatchIds: pinned.includes(matchId)
                ? pinned.filter((i) => i !== matchId)
                : [...pinned, matchId].slice(-MAX_MATCHES),
        });

    const captions: Record<Screen, string> = {
        auto: live.length ? 'Leaderboard + a live match' : 'Leaderboard, no match running',
        leaderboard: scopeLabels[config.scope],
        live: live.length ? `${live.length} running` : 'None running',
        focus:
            screen === 'focus' && picked.length
                ? versus(live.find((i) => i.id === config.focusMatchId) ?? picked[0])
                : live.length
                  ? `${live.length} running`
                  : 'None running',
    };

    const noLive = (
        <p className="text-text-3">
            No live matches. They show up here when someone starts one in the app.
        </p>
    );

    return (
        <Page title={board.data?.group.name ?? config.groupName ?? ''} offline={!connected}>
            <div className="grid grid-cols-2 gap-3">
                {screens.map((s) => (
                    <ScreenTile
                        key={s.value}
                        screen={s.value}
                        label={s.label}
                        caption={captions[s.value]}
                        selected={screen === s.value}
                        disabled={s.value === 'focus' && !live.length}
                        onPress={() => choose(s.value)}
                    />
                ))}
            </div>

            {screen === 'auto' && (
                <Section title="Next to the leaderboard">
                    {live.length === 0 ? (
                        <p className="text-text-3">
                            When someone starts a match in the app, it shows here and next to the
                            leaderboard.
                        </p>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            <Choice
                                selected={!pinned.length}
                                onPress={() => send({ pinnedMatchIds: [] })}
                                mark={<Radio on={!pinned.length} />}
                            >
                                <div className="font-semibold">Automatic</div>
                                <div className="truncate text-sm text-text-3">
                                    {pinned.length
                                        ? 'One of the latest'
                                        : `Now ${versus(picked[0])}`}
                                </div>
                            </Choice>
                            {live.map((m) => (
                                <Choice
                                    key={m.id}
                                    selected={pinned[0] === m.id}
                                    onPress={() =>
                                        send({
                                            pinnedMatchIds: [
                                                m.id,
                                                ...pinned.filter((i) => i !== m.id),
                                            ],
                                        })
                                    }
                                    mark={<Radio on={pinned[0] === m.id} />}
                                >
                                    <MatchSummary match={m} />
                                </Choice>
                            ))}
                        </ul>
                    )}
                </Section>
            )}

            {(screen === 'auto' || screen === 'leaderboard') && (
                <Section title="Leaderboard">
                    <Segmented<Scope>
                        value={config.scope}
                        onChange={(scope) => send({ scope })}
                        options={[
                            { value: 'season', label: 'Season' },
                            { value: 'today', label: 'Today' },
                            { value: 'all-time', label: 'All time' },
                        ]}
                    />
                    {config.scope !== 'all-time' && (board.data?.seasons.length ?? 0) > 1 && (
                        <select
                            value={config.seasonId ?? ''}
                            onChange={(e) => send({ seasonId: e.target.value || null })}
                            className="w-full rounded-xl border border-line bg-panel-2 px-4 py-3 text-base"
                        >
                            <option value="">Current season</option>
                            {board
                                .data!.seasons.filter((i) => !i.active)
                                .map((i) => (
                                    <option key={i.id} value={i.id}>
                                        {i.name}
                                    </option>
                                ))}
                        </select>
                    )}
                </Section>
            )}

            {screen === 'live' && (
                <Section title="Matches on the TV">
                    {live.length === 0 ? (
                        noLive
                    ) : (
                        <>
                            <p className="text-sm text-text-3">
                                Pick up to {MAX_MATCHES}, in the order they show. Open spots fill up
                                with the latest.
                            </p>
                            <ul className="flex flex-col gap-2">
                                {live.map((m) => {
                                    const index = pinned.indexOf(m.id);
                                    return (
                                        <Choice
                                            key={m.id}
                                            selected={index >= 0}
                                            onPress={() => togglePin(m.id)}
                                            mark={<PinMark index={index} />}
                                        >
                                            <MatchSummary
                                                match={m}
                                                onTv={picked.some((i) => i.id === m.id)}
                                            />
                                        </Choice>
                                    );
                                })}
                            </ul>
                        </>
                    )}
                </Section>
            )}

            {screen === 'focus' && (
                <Section title="On the whole screen">
                    <ul className="flex flex-col gap-2">
                        {live.map((m) => (
                            <Choice
                                key={m.id}
                                selected={config.focusMatchId === m.id}
                                onPress={() => send({ focusMatchId: m.id })}
                                mark={<Radio on={config.focusMatchId === m.id} />}
                            >
                                <MatchSummary match={m} />
                            </Choice>
                        ))}
                    </ul>
                    <p className="text-sm text-text-3">
                        When it ends, the TV goes back to{' '}
                        {screens.find((i) => i.value === config.view)?.label}.
                    </p>
                </Section>
            )}

            <Section title="Group">
                <ConnectGroup id={id} keyValue={key} compact />
                <button
                    onClick={() => {
                        if (confirm('Take this group off the TV?'))
                            disconnectGroup({ data: { id, key } });
                    }}
                    className="rounded-xl py-3 text-red active:bg-panel-2"
                >
                    Remove group from TV
                </button>
            </Section>

            <Section title="TV">
                <button
                    onClick={() => reloadDisplay({ data: { id, key } }).catch(() => {})}
                    className="rounded-xl border border-line bg-panel-2 py-3 font-semibold active:scale-[0.98]"
                >
                    Reload TV
                </button>
                <p className="text-sm text-text-3">
                    Reloads the page on the TV, so it gets the newest version after an update.
                </p>
            </Section>
        </Page>
    );
}

/** what the TV shows: one of the views, or a live match on the whole screen */
type Screen = View | 'focus';

const screens: { value: Screen; label: string }[] = [
    { value: 'auto', label: 'Auto' },
    { value: 'leaderboard', label: 'Leaderboard' },
    { value: 'live', label: 'Live' },
    { value: 'focus', label: 'One match' },
];

const scopeLabels: Record<Scope, string> = {
    season: 'This season',
    today: 'Today',
    'all-time': 'All time',
};

const names = (team: LiveMatchView['blue']) => team.players.map((p) => p.name).join(' & ') || '…';
const versus = (match: LiveMatchView) => `${names(match.blue)} vs ${names(match.red)}`;

function ScreenTile({
    screen,
    label,
    caption,
    selected,
    disabled,
    onPress,
}: {
    screen: Screen;
    label: string;
    caption: string;
    selected: boolean;
    disabled: boolean;
    onPress: () => void;
}) {
    return (
        <button
            onClick={onPress}
            disabled={disabled}
            aria-pressed={selected}
            className={`flex flex-col gap-2 rounded-2xl border p-3 text-left transition active:scale-[0.97] disabled:opacity-40 ${selected ? 'border-live bg-live/10' : 'border-line bg-panel'}`}
        >
            <Sketch screen={screen} active={selected} />
            <div className="min-w-0">
                <div className="font-semibold">{label}</div>
                <div className="truncate text-xs text-text-3">{caption}</div>
            </div>
        </button>
    );
}

/** a small drawing of a screen's layout on the TV */
function Sketch({ screen, active }: { screen: Screen; active: boolean }) {
    const line = <div className="h-[3px] rounded-full bg-text-3/60" />;
    const lines = (n: number) => Array.from({ length: n }, (_, i) => <div key={i}>{line}</div>);
    const match = (
        <div className="flex min-h-0 flex-1 gap-px overflow-hidden rounded-[3px]">
            <div className="flex-1 bg-blue/60" />
            <div className="flex-1 bg-red/60" />
        </div>
    );

    return (
        <div
            className={`flex aspect-video gap-1.5 rounded-lg border p-1.5 ${active ? 'border-live/50 bg-black' : 'border-line bg-panel-2'}`}
        >
            {screen === 'auto' && (
                <>
                    <div className="flex flex-[1.45] flex-col justify-around">{lines(5)}</div>
                    <div className="flex flex-1 flex-col">{match}</div>
                </>
            )}
            {screen === 'leaderboard' && (
                <div className="flex flex-1 flex-col gap-1">
                    <div className="flex h-1/2 items-end justify-center gap-1">
                        <div className="h-2/3 w-3 rounded-t-[2px] bg-text-3/60" />
                        <div className="h-full w-3 rounded-t-[2px] bg-gold/80" />
                        <div className="h-1/2 w-3 rounded-t-[2px] bg-text-3/60" />
                    </div>
                    <div className="grid flex-1 grid-cols-2 content-around gap-x-1.5">
                        {lines(4)}
                    </div>
                </div>
            )}
            {screen === 'live' && (
                <>
                    {match}
                    {match}
                </>
            )}
            {screen === 'focus' && match}
        </div>
    );
}

/** a row of a single or multiple choice */
function Choice({
    selected,
    onPress,
    mark,
    children,
}: {
    selected: boolean;
    onPress: () => void;
    mark: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <li>
            <button
                onClick={onPress}
                aria-pressed={selected}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.98] ${selected ? 'border-live bg-live/10' : 'border-line bg-panel'}`}
            >
                <div className="min-w-0 flex-1">{children}</div>
                {mark}
            </button>
        </li>
    );
}

function Radio({ on }: { on: boolean }) {
    return (
        <div
            className={`grid size-6 shrink-0 place-items-center rounded-full border-2 ${on ? 'border-live' : 'border-line'}`}
        >
            {on && <div className="size-2.5 rounded-full bg-live" />}
        </div>
    );
}

/** a picked match's place on the TV, or + to pick it */
function PinMark({ index }: { index: number }) {
    return (
        <div
            className={`grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold ${index >= 0 ? 'bg-live text-black' : 'border border-line text-text-3'}`}
        >
            {index >= 0 ? index + 1 : '+'}
        </div>
    );
}

function MatchSummary({ match, onTv }: { match: LiveMatchView; onTv?: boolean }) {
    const now = useNow();
    return (
        <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-blue">{names(match.blue)}</div>
                <div className="truncate text-sm text-red">{names(match.red)}</div>
                <div className="tabular text-xs text-text-3">
                    {formatElapsed(now - Date.parse(match.startedAt))}
                    {onTv && ' · on the TV'}
                </div>
            </div>
            <div className="tabular text-xl font-black">
                <span className="text-blue">{match.blue.score}</span>
                <span className="text-text-3">–</span>
                <span className="text-red">{match.red.score}</span>
            </div>
        </div>
    );
}

function ConnectGroup({
    id,
    keyValue,
    compact,
}: {
    id: string;
    keyValue: string;
    compact?: boolean;
}) {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            const res = await connectGroup({ data: { id, key: keyValue, inviteCode: code } });
            if ('error' in res && res.error) setError(res.error);
            else setCode('');
        } catch {
            setError('That didn’t work. Try again.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit} className="flex flex-col gap-3">
            {!compact && (
                <>
                    <h1 className="text-2xl font-black">Put your group on the TV</h1>
                    <p className="text-text-2">
                        Enter your group code. In the app, it's in the invite menu under Copy Group
                        Code.
                    </p>
                </>
            )}
            <div className="flex gap-2">
                <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder={compact ? 'Another group code' : 'Group code'}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="min-w-0 flex-1 rounded-xl border border-line bg-panel-2 px-4 py-3 text-base"
                />
                <button
                    disabled={busy || !code.trim()}
                    className="rounded-xl bg-text px-5 font-semibold text-black disabled:opacity-40"
                >
                    {busy ? '…' : compact ? 'Switch' : 'Show'}
                </button>
            </div>
            {error && <p className="text-sm text-red">{error}</p>}
        </form>
    );
}

function Page({
    title,
    offline,
    children,
}: {
    title?: string;
    offline?: boolean;
    children: React.ReactNode;
}) {
    return (
        <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-10">
            <header>
                <div className="text-xs font-semibold tracking-[0.3em] text-text-3">
                    VERSUS TV · REMOTE
                </div>
                {title && <h1 className="truncate text-2xl font-black">{title}</h1>}
                {offline && <p className="text-sm text-red">Reconnecting…</p>}
            </header>
            {children}
        </main>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold tracking-[0.2em] text-text-3 uppercase">
                {title}
            </h2>
            {children}
        </section>
    );
}

function Segmented<T extends string>({
    value,
    onChange,
    options,
}: {
    value: T;
    onChange: (value: T) => void;
    options: { value: T; label: string }[];
}) {
    return (
        <div className="grid auto-cols-fr grid-flow-col rounded-xl bg-panel-2 p-1">
            {options.map((o) => (
                <button
                    key={o.value}
                    onClick={() => onChange(o.value)}
                    aria-pressed={value === o.value}
                    className={`rounded-lg py-2 text-sm font-semibold transition ${value === o.value ? 'bg-text text-black' : 'text-text-2'}`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}
