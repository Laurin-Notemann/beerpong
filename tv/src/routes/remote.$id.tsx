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
} from '~/lib/display';
import { type DisplayEvent, useBoard, useDisplayEvents, useNow } from '~/lib/hooks';
import { formatElapsed } from '~/lib/liveMatch';
import type { LiveMatchView } from '~/server/board';
import { connectGroup, disconnectGroup, updateDisplay } from '~/server/functions';

/** The phone's remote for one TV, opened from the TV's QR code (`k` is the TV's control key). */
export const Route = createFileRoute('/remote/$id')({
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
    const picked = pickMatches(board.data?.liveMatches ?? [], config.pinnedMatchIds).map(
        (i) => i.id
    );
    const layout = layoutFor(
        config,
        live.map((i) => i.id)
    );
    // the live matches the TV shows right now
    const shown =
        layout === 'focus'
            ? [config.focusMatchId]
            : layout === 'split'
              ? picked.slice(0, 1)
              : layout === 'live'
                ? picked
                : [];
    const focused = layout === 'focus' ? live.find((i) => i.id === config.focusMatchId) : undefined;

    const togglePin = (matchId: string) => {
        const pinned = config.pinnedMatchIds.filter((i) => live.some((m) => m.id === i));
        send({
            pinnedMatchIds: pinned.includes(matchId)
                ? pinned.filter((i) => i !== matchId)
                : [...pinned, matchId].slice(-MAX_MATCHES),
        });
    };

    return (
        <Page title={board.data?.group.name ?? config.groupName ?? ''} offline={!connected}>
            {focused && (
                <div className="flex items-center gap-3 rounded-2xl border border-live bg-live/10 p-3">
                    <div className="min-w-0 flex-1 text-sm">
                        <div className="font-semibold">Full screen on the TV</div>
                        <div className="truncate text-text-2">
                            {focused.blue.players.map((p) => p.name).join(' & ')} vs{' '}
                            {focused.red.players.map((p) => p.name).join(' & ')}
                        </div>
                    </div>
                    <button
                        onClick={() => send({ focusMatchId: null })}
                        className="rounded-xl bg-text px-4 py-2 text-sm font-semibold text-black"
                    >
                        Exit
                    </button>
                </div>
            )}
            <Section title="On the TV">
                <Segmented<View>
                    value={config.view}
                    onChange={(view) => send({ view })}
                    options={[
                        { value: 'auto', label: 'Auto' },
                        { value: 'leaderboard', label: 'Leaderboard' },
                        { value: 'live', label: 'Live' },
                    ]}
                />
                <p className="text-sm text-text-3">
                    {config.view === 'auto'
                        ? 'The leaderboard next to a live match while one is live, the full leaderboard otherwise.'
                        : config.view === 'live'
                          ? 'Only live matches.'
                          : 'Only the leaderboard.'}
                </p>
            </Section>

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

            <Section title={`Live matches${live.length ? ` · ${live.length}` : ''}`}>
                {live.length === 0 ? (
                    <p className="text-text-3">
                        No live matches. They show up here when someone starts one in the app.
                    </p>
                ) : (
                    <>
                        <p className="text-sm text-text-3">
                            Tap a match to show it first; the rest fill up with the latest. Next to
                            the leaderboard the TV shows one, in Live up to {MAX_MATCHES}. ⤢ puts a
                            match on the whole screen until it ends.
                        </p>
                        <ul className="flex flex-col gap-2">
                            {live.map((m) => (
                                <MatchRow
                                    key={m.id}
                                    match={m}
                                    pinIndex={config.pinnedMatchIds.indexOf(m.id)}
                                    onTv={shown.includes(m.id)}
                                    focused={config.focusMatchId === m.id}
                                    onPress={() => togglePin(m.id)}
                                    onFocus={() =>
                                        send({
                                            focusMatchId:
                                                config.focusMatchId === m.id ? null : m.id,
                                        })
                                    }
                                />
                            ))}
                        </ul>
                    </>
                )}
            </Section>

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
        </Page>
    );
}

function MatchRow({
    match,
    pinIndex,
    onTv,
    focused,
    onPress,
    onFocus,
}: {
    match: LiveMatchView;
    pinIndex: number;
    onTv: boolean;
    focused: boolean;
    onPress: () => void;
    onFocus: () => void;
}) {
    const now = useNow();
    const names = (team: LiveMatchView['blue']) =>
        team.players.map((p) => p.name).join(' & ') || '…';

    return (
        <li className="flex items-stretch gap-2">
            <button
                onClick={onPress}
                aria-pressed={pinIndex >= 0}
                className={`flex min-w-0 flex-1 items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.98] ${pinIndex >= 0 ? 'border-live bg-live/10' : 'border-line bg-panel'}`}
            >
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
                <div
                    className={`grid size-7 place-items-center rounded-full text-sm font-bold ${pinIndex >= 0 ? 'bg-live text-black' : 'border border-line text-text-3'}`}
                >
                    {pinIndex >= 0 ? pinIndex + 1 : '+'}
                </div>
            </button>
            <button
                onClick={onFocus}
                aria-pressed={focused}
                aria-label={focused ? 'Exit full screen' : 'Full screen on the TV'}
                className={`grid w-12 shrink-0 place-items-center rounded-2xl border text-xl transition active:scale-95 ${focused ? 'border-live bg-live text-black' : 'border-line bg-panel text-text-2'}`}
            >
                ⤢
            </button>
        </li>
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
