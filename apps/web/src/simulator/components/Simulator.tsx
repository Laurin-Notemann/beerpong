import { useEffect, useMemo, useRef, useState } from 'react';

import {
    type Game,
    getReplays,
    type Params,
    type Score,
    type Search,
    searchWeights,
    type Simulation,
    type TestGame,
} from '~/simulator/api';
import { Board } from '~/simulator/components/Board';
import { Chart } from '~/simulator/components/Chart';
import { Games } from '~/simulator/components/Games';
import { LiveNow } from '~/simulator/components/LiveNow';
import { Parts } from '~/simulator/components/Parts';
import { Replay } from '~/simulator/components/Replay';
import { TestEditor } from '~/simulator/components/TestEditor';
import { pct } from '~/simulator/format';
import type { LiveStatus } from '~/simulator/live';
import type { LiveMatchDto } from '~/simulator/liveMatch';

const sliders: {
    key: 'k' | 'kr' | 'swing' | 'spread';
    label: string;
    min: number;
    max: number;
    step: number;
    tone?: 'r' | 's';
}[] = [
    { key: 'k', label: 'Hitting (K)', min: 0, max: 400, step: 5, tone: 's' },
    { key: 'kr', label: 'Result (KR)', min: 0, max: 400, step: 5, tone: 'r' },
    { key: 'swing', label: 'Swing: how far ratings move', min: 0.5, max: 10, step: 0.5 },
    {
        key: 'spread',
        label: 'Spread: gap for 10× scoring at Swing 1',
        min: 250,
        max: 8000,
        step: 250,
    },
];

// what a ring win's result counts, against a normal win's
const ringChoices = [
    { value: 0, label: 'like a normal win' },
    { value: 0.5, label: '√ of the bonus ratio' },
    { value: 1, label: 'the bonus ratio' },
];

const weights = ['k', 'kr', 'ringWeight', 'swing', 'spread'] as const;

const noWeights = {
    k: undefined,
    kr: undefined,
    ringWeight: undefined,
    swing: undefined,
    spread: undefined,
};

type Change = { season?: string; tests?: TestGame[] } & Partial<Params>;

export function Simulator({
    sim,
    code,
    tests,
    live,
    onChange,
}: {
    sim: Simulation;
    code: string;
    tests: TestGame[];
    live: LiveStatus;
    onChange: (change: Change) => void;
}) {
    // what the sliders show while the API computes them
    const [draft, setDraft] = useState<Params>();
    const params = draft ?? sim.params;
    const change = useRef(onChange);
    useEffect(() => {
        change.current = onChange;
    }, [onChange]);
    useEffect(() => {
        if (!draft) return;
        const t = setTimeout(() => change.current(draft), 150);
        return () => clearTimeout(t);
    }, [draft]);
    // the API caught up with the sliders
    if (draft && weights.every((key) => draft[key] === sim.params[key])) setDraft(undefined);

    const [best, setBest] = useState<Search>();
    const [searching, setSearching] = useState(false);
    const [failed, setFailed] = useState<string>();

    const isDefault = weights.every((key) => params[key] === sim.defaults[key]);
    const totalGames = sim.seasons.reduce((n, s) => n + s.numMatches, 0);
    const pred = sim.prediction;

    return (
        <>
            <header className="top wrap">
                <div className="eyebrow">beerpong-var · runs apps/api/internal/leaderboard</div>
                <h1>
                    {sim.groupName} <span className="cup">Elo simulator</span>
                </h1>
                <p className="lead">
                    Every season of the group, computed by the API with the leaderboard's own Elo
                    code and updated live when a match is entered. Every season has its own weights;
                    drag the sliders to try others. The leaderboard, every game and the prediction
                    score follow.
                </p>
            </header>

            <div className="controls" role="region" aria-label="Settings">
                <div className="wrap">
                    <div>
                        <div className="seg seasons" role="group" aria-label="Season">
                            {sim.seasons
                                .filter((s) => s.numMatches > 0 || s.id === sim.seasonId)
                                .map((s) => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        aria-pressed={s.id === sim.seasonId}
                                        // test games belong to the season they were made in
                                        onClick={() => onChange({ season: s.id, tests: undefined })}
                                    >
                                        {s.name ?? 'Running season'} · {s.numMatches}
                                    </button>
                                ))}
                        </div>
                        <div className="engine">
                            <span
                                className={`livestatus ${live === 'live' ? 'on' : live === 'offline' ? 'off' : ''}`}
                            >
                                <i />
                                {live === 'live'
                                    ? 'Live'
                                    : live === 'offline'
                                      ? 'Offline, reconnecting'
                                      : 'Connecting'}
                            </span>
                        </div>
                    </div>
                    <div className="sliders">
                        {sliders.map((s) => (
                            <div key={s.key} className={`slider ${s.tone ?? ''}`}>
                                <label htmlFor={s.key}>
                                    {s.label} <output>{params[s.key]}</output>
                                </label>
                                <input
                                    id={s.key}
                                    type="range"
                                    min={s.min}
                                    max={s.max}
                                    step={s.step}
                                    value={params[s.key]}
                                    onChange={(e) =>
                                        setDraft({ ...params, [s.key]: Number(e.target.value) })
                                    }
                                />
                            </div>
                        ))}
                        <div className="slider">
                            <label htmlFor="ringWeight">A ring win counts</label>
                            <select
                                id="ringWeight"
                                value={params.ringWeight}
                                onChange={(e) =>
                                    setDraft({ ...params, ringWeight: Number(e.target.value) })
                                }
                            >
                                {/* a weight from the URL that isn't one of the three */}
                                {!ringChoices.some((c) => c.value === params.ringWeight) && (
                                    <option value={params.ringWeight}>
                                        bonus ratio^{params.ringWeight}
                                    </option>
                                )}
                                {ringChoices.map((c) => (
                                    <option key={c.value} value={c.value}>
                                        {c.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="btns">
                        <button
                            className="btn"
                            type="button"
                            disabled={isDefault}
                            title="Back to the season's settings"
                            onClick={() => {
                                setDraft(undefined);
                                onChange(noWeights);
                            }}
                        >
                            Reset to the season's settings
                        </button>
                        <button
                            className="btn"
                            type="button"
                            disabled={searching || !totalGames}
                            onClick={() => {
                                setSearching(true);
                                setFailed(undefined);
                                searchWeights({ data: code })
                                    .then((b) => {
                                        if (!b) return;
                                        setBest(b);
                                        onChange(b.params);
                                    })
                                    .catch((e: unknown) => setFailed(String(e)))
                                    .finally(() => setSearching(false));
                            }}
                        >
                            Find best settings
                        </button>
                    </div>
                </div>
            </div>

            <main className="wrap">
                <section aria-labelledby="h-pred">
                    <div className="section-head">
                        <h2 id="h-pred">How well do the ratings predict the next game?</h2>
                        <p>
                            All {totalGames} games, every season from 1500, using only the ratings
                            from before each game.
                        </p>
                    </div>
                    <div className="pred">
                        <Tile title="Every season's own settings" score={pred.defaults} />
                        <Tile
                            title={
                                isDefault
                                    ? "Your settings (= the season's settings)"
                                    : 'Your settings, on every season'
                            }
                            score={pred.params}
                            me
                        />
                    </div>
                    <div className="searchout">
                        {searching ? (
                            `Trying settings on all ${totalGames} games…`
                        ) : failed ? (
                            <span className="err">The search failed: {failed}</span>
                        ) : best ? (
                            <>
                                Best of {best.tried} settings: hitting <b>{best.params.k}</b>,
                                result <b>{best.params.kr}</b>, ring weight{' '}
                                <b>{best.params.ringWeight}</b>, swing <b>{best.params.swing}</b>,
                                spread <b>{best.params.spread}</b> → favourite won{' '}
                                <b>{pct(best.prediction.correct)}</b>, score{' '}
                                {best.prediction.logLoss.toFixed(3)}. Applied. With a few hundred
                                games, differences under ~0.005 are noise.
                            </>
                        ) : (
                            `Prediction score: lower is better; a coin flip scores 0.693. “Favourite won” leaves out the ${
                                pred.params.games - pred.params.called
                            } games where both teams were rated the same (each season's first games).`
                        )}
                    </div>
                </section>

                {sim.testError ? (
                    <div className="testbar err">
                        The test games couldn't be counted: {sim.testError}
                        <button
                            type="button"
                            className="icon"
                            onClick={() => onChange({ tests: undefined })}
                        >
                            Remove them
                        </button>
                    </div>
                ) : (
                    tests.length > 0 && (
                        <div className="testbar">
                            {tests.length === 1
                                ? 'One test game is'
                                : `${tests.length} test games are`}{' '}
                            counted here, and nowhere else.
                            <button
                                type="button"
                                className="icon"
                                onClick={() => onChange({ tests: undefined })}
                            >
                                Remove all
                            </button>
                        </div>
                    )
                )}

                {sim.seasonId && (
                    <Season
                        key={sim.seasonId}
                        sim={sim}
                        code={code}
                        params={sim.params}
                        tests={sim.testError ? [] : tests}
                        unchanged={
                            sim.baseline === 'defaults' &&
                            weights.every((key) => sim.params[key] === sim.defaults[key])
                        }
                        onTests={(next) => onChange({ tests: next.length ? next : undefined })}
                    />
                )}
            </main>
            <footer className="wrap">
                beerpong-var shows what the API's <code>GET /elo-simulation</code> computes with the
                leaderboard's own code, so with the season's settings it shows exactly the app's
                Elo.
            </footer>
        </>
    );
}

// Editing is a new test game at a position, or an existing one.
type Editing = { after: string; at: number } | { index: number };

// Season is one season's breakdown; switching seasons starts it fresh.
function Season({
    sim,
    code,
    params,
    tests,
    unchanged,
    onTests,
}: {
    sim: Simulation;
    code: string;
    params: Params;
    tests: TestGame[];
    unchanged: boolean;
    onTests: (tests: TestGame[]) => void;
}) {
    // the season's games entered live, to replay; fetched again when a game comes in. A failed
    // fetch only leaves the replay out (the server reports it).
    const [liveLogs, setLiveLogs] = useState<LiveMatchDto[]>([]);
    const stored = useMemo(
        () => sim.games.filter((g) => g.testIndex == null && g.liveMatchId == null),
        [sim.games]
    );
    useEffect(() => {
        if (!sim.seasonId) return;
        let stale = false;
        getReplays({ data: { code, season: sim.seasonId } })
            .then((list) => !stale && setLiveLogs(list))
            .catch(() => {});
        return () => {
            stale = true;
        };
    }, [code, sim.seasonId, stored.length]);
    // newest first, each with its stored game
    const replays = useMemo(
        () =>
            stored
                .flatMap((game) => {
                    const dto = liveLogs.find((l) => l.resultMatchId === game.matchId);
                    return dto ? [{ dto, game }] : [];
                })
                .reverse(),
        [liveLogs, stored]
    );
    // the open game by id: live games come and go, so positions shift and an
    // open game can disappear
    const [selId, setSelId] = useState<string | null>(null);
    const found = selId == null ? -1 : sim.games.findIndex((g) => g.matchId === selId);
    const sel = found >= 0 ? found : null;
    const setSel = (gi: number | null) =>
        setSelId(gi == null ? null : (sim.games[gi]?.matchId ?? null));
    const [editing, setEditing] = useState<Editing | null>(null);
    const season = sim.seasons.find((s) => s.id === sim.seasonId);

    // a new game right after `after`: before the test games already there,
    // so it lands where it was asked for
    const add = (after: Game | 'start' | 'end') => {
        if (after === 'start' || after === 'end') {
            const first = tests.findIndex((t) => t.after === after);
            setEditing({ after, at: after === 'start' && first >= 0 ? first : tests.length });
        } else if (after.testIndex != null) {
            setEditing({ after: tests[after.testIndex].after, at: after.testIndex + 1 });
        } else {
            const first = tests.findIndex((t) => t.after === after.matchId);
            setEditing({ after: after.matchId, at: first >= 0 ? first : tests.length });
        }
        setTimeout(() =>
            document
                .getElementById('test-editor')
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        );
    };
    const where = (after: string) => {
        if (after === 'start') return 'at the start';
        if (after === 'end') return 'at the end';
        const n = sim.games
            .filter((g) => g.testIndex == null)
            .findIndex((g) => g.matchId === after);
        return n >= 0 ? `after game ${n + 1}` : 'after a game that is gone';
    };
    const [follow, setFollow] = useState<Set<string>>(new Set());
    const toggleFollow = (id: string) =>
        setFollow((f) => {
            const next = new Set(f);
            if (!next.delete(id)) next.add(id);
            return next;
        });
    return (
        <>
            {sim.games.length > 0 && <Parts params={params} games={sim.games} sel={sel} />}

            <LiveNow
                games={sim.games}
                onOpen={(gi) => {
                    setSel(gi);
                    setTimeout(() =>
                        document
                            .querySelector(`#games tr[data-g="${gi}"]`)
                            ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    );
                }}
            />

            {replays.length > 0 && <Replay sim={sim} code={code} replays={replays} />}

            <section aria-labelledby="h-board">
                <div className="section-head">
                    <h2 id="h-board">Leaderboard</h2>
                    <div className="split-legend">
                        <span className="key">
                            <i className="r" />
                            from team results
                        </span>
                        <span className="key">
                            <i className="s" />
                            from hitting above or below expectation
                        </span>
                    </div>
                </div>
                <Board
                    standings={sim.standings}
                    baseline={sim.baseline}
                    unchanged={unchanged}
                    minMatches={season?.minMatchesToQualify ?? 0}
                    follow={follow}
                    onToggle={toggleFollow}
                />
            </section>

            {sim.games.length > 0 && (
                <section aria-labelledby="h-chart">
                    <div className="section-head">
                        <h2 id="h-chart">Elo over the season</h2>
                        <p>Hover for the game, click to open it below.</p>
                    </div>
                    <div className="card">
                        <Chart
                            games={sim.games}
                            standings={sim.standings}
                            follow={follow}
                            sel={sel}
                            onSelect={(gi) => {
                                setSel(gi);
                                document
                                    .querySelector(`#games tr[data-g="${gi}"]`)
                                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                        />
                        <div className="chips" role="group" aria-label="Highlight players">
                            {sim.standings.map((s) => (
                                <button
                                    key={s.profileId}
                                    type="button"
                                    className="chip"
                                    aria-pressed={follow.has(s.profileId)}
                                    onClick={() => toggleFollow(s.profileId)}
                                >
                                    {s.name}
                                </button>
                            ))}
                            {follow.size > 0 && (
                                <button
                                    type="button"
                                    className="chip"
                                    onClick={() => setFollow(new Set())}
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>
                </section>
            )}

            <section aria-labelledby="h-games">
                <div className="section-head">
                    <h2 id="h-games">What every game was worth</h2>
                    <p>Points are what the app shows. Click a game for every move and change.</p>
                </div>
                {editing && (
                    <div id="test-editor">
                        <TestEditor
                            // a fresh form for every game it edits
                            key={
                                'index' in editing
                                    ? `edit-${editing.index}`
                                    : `add-${editing.after}-${editing.at}`
                            }
                            sim={sim}
                            initial={'index' in editing ? tests[editing.index] : undefined}
                            where={where(
                                'index' in editing ? tests[editing.index].after : editing.after
                            )}
                            onCancel={() => setEditing(null)}
                            onSave={(teams) => {
                                if ('index' in editing) {
                                    onTests(
                                        tests.map((t, i) =>
                                            i === editing.index ? { ...t, teams } : t
                                        )
                                    );
                                } else {
                                    onTests([
                                        ...tests.slice(0, editing.at),
                                        { after: editing.after, teams },
                                        ...tests.slice(editing.at),
                                    ]);
                                }
                                setEditing(null);
                                setSel(null);
                            }}
                        />
                    </div>
                )}
                <Games
                    games={sim.games}
                    sel={sel}
                    onSelect={setSel}
                    onAdd={add}
                    onEdit={(index) => {
                        setEditing({ index });
                        setTimeout(() =>
                            document
                                .getElementById('test-editor')
                                ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        );
                    }}
                    onRemove={(index) => {
                        onTests(tests.filter((_, i) => i !== index));
                        setEditing(null);
                        setSel(null);
                    }}
                />
            </section>
        </>
    );
}

function Tile({ title, score, me }: { title: string; score: Score; me?: boolean }) {
    return (
        <div className={`tile ${me ? 'me' : ''}`}>
            <div className="lbl">{title}</div>
            <div className="big">{pct(score.correct)}</div>
            <div className="sub">favourite won · prediction score {score.logLoss.toFixed(3)}</div>
        </div>
    );
}
