import { useEffect, useState } from 'react';

import { type Params, type Score, type Search, searchWeights, type Simulation } from '@/api';
import { Board } from '@/components/Board';
import { Chart } from '@/components/Chart';
import { Games } from '@/components/Games';
import { Parts } from '@/components/Parts';
import { pct } from '@/format';
import type { LiveStatus } from '@/live';

const sliders: { key: keyof Params; label: string; min: number; max: number; step: number; tone?: 'r' | 's' }[] = [
    { key: 'k', label: 'Result weight (K)', min: 50, max: 800, step: 10, tone: 'r' },
    { key: 'marginWeight', label: 'Margin & rings', min: 0, max: 1.5, step: 0.05, tone: 'r' },
    { key: 'perPoint', label: 'Elo per point', min: 0, max: 100, step: 1, tone: 's' },
    { key: 'topWeight', label: 'Best player weight', min: 0, max: 1, step: 0.05 },
];

const noWeights = { k: undefined, marginWeight: undefined, perPoint: undefined, topWeight: undefined };

type Change = { season?: string } & Partial<Params>;

export function Simulator({
    sim,
    code,
    live,
    onChange,
}: {
    sim: Simulation;
    code: string;
    live: LiveStatus;
    onChange: (change: Change) => void;
}) {
    // what the sliders show while the API computes them
    const [draft, setDraft] = useState<Params>();
    const params = draft ?? sim.params;
    useEffect(() => {
        if (!draft) return;
        const t = setTimeout(() => onChange(draft), 150);
        return () => clearTimeout(t);
    }, [draft]);
    // the API caught up with the sliders
    useEffect(() => {
        if (draft && sliders.every(({ key }) => draft[key] === sim.params[key])) setDraft(undefined);
    }, [sim.params]);

    const [best, setBest] = useState<Search>();
    const [searching, setSearching] = useState(false);
    const [failed, setFailed] = useState<string>();

    const isDefault = sliders.every(({ key }) => params[key] === sim.defaults[key]);
    const totalGames = sim.seasons.reduce((n, s) => n + s.numMatches, 0);
    const pred = sim.prediction;

    return (
        <>
            <header className="top wrap">
                <div className="eyebrow">beerpong-var · runs api-go/internal/leaderboard</div>
                <h1>
                    {sim.groupName} <span className="cup">Elo simulator</span>
                </h1>
                <p className="lead">
                    Every season of the group, computed by the API with the leaderboard's own Elo code and updated
                    live when a match is entered. Drag the sliders to try other weights than <code>DefaultElo</code>{' '}
                    in <code>elo.go</code>; the leaderboard, every game and the prediction score follow.
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
                                        onClick={() => onChange({ season: s.id })}
                                    >
                                        {s.name ?? 'Running season'} · {s.numMatches}
                                    </button>
                                ))}
                        </div>
                        <div className="engine">
                            <span className={`live ${live === 'live' ? 'on' : live === 'offline' ? 'off' : ''}`}>
                                <i />
                                {live === 'live' ? 'Live' : live === 'offline' ? 'Offline, reconnecting' : 'Connecting'}
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
                                    onChange={(e) => setDraft({ ...params, [s.key]: Number(e.target.value) })}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="btns">
                        <button
                            className="btn"
                            type="button"
                            disabled={isDefault}
                            onClick={() => {
                                setDraft(undefined);
                                onChange(noWeights);
                            }}
                        >
                            Reset
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
                            All {totalGames} games, every season from 1500, using only the ratings from before each
                            game.
                        </p>
                    </div>
                    <div className="pred">
                        <Tile title="Defaults in elo.go" score={pred.defaults} />
                        <Tile
                            title={isDefault ? 'Your settings (= defaults)' : 'Your settings'}
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
                                Best of {best.tried} settings: result weight <b>{best.params.k}</b>, margin{' '}
                                <b>{best.params.marginWeight}</b>, Elo per point <b>{best.params.perPoint}</b>, best
                                player weight <b>{best.params.topWeight}</b> → favourite won{' '}
                                <b>{pct(best.prediction.correct)}</b>, score {best.prediction.logLoss.toFixed(3)}.
                                Applied. With a few hundred games, differences under ~0.005 are noise.
                            </>
                        ) : (
                            `Prediction score: lower is better; a coin flip scores 0.693. “Favourite won” leaves out the ${
                                pred.params.games - pred.params.called
                            } games where both teams were rated the same (each season's first games).`
                        )}
                    </div>
                </section>

                {sim.games.length > 0 && (
                    <Season
                        key={sim.seasonId}
                        sim={sim}
                        params={sim.params}
                        isDefault={sliders.every(({ key }) => sim.params[key] === sim.defaults[key])}
                    />
                )}
            </main>
            <footer className="wrap">
                beerpong-var shows what the API's <code>GET /elo-simulation</code> computes with the leaderboard's own
                code, so with the defaults it shows exactly the app's Elo.
            </footer>
        </>
    );
}

// Season is one season's breakdown; switching seasons starts it fresh.
function Season({ sim, params, isDefault }: { sim: Simulation; params: Params; isDefault: boolean }) {
    const [sel, setSel] = useState<number | null>(null);
    const [follow, setFollow] = useState<Set<string>>(new Set());
    const toggleFollow = (id: string) =>
        setFollow((f) => {
            const next = new Set(f);
            if (!next.delete(id)) next.add(id);
            return next;
        });
    return (
        <>
            <Parts params={params} games={sim.games} sel={sel} />

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
                <Board standings={sim.standings} isDefault={isDefault} follow={follow} onToggle={toggleFollow} />
            </section>

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
                            <button type="button" className="chip" onClick={() => setFollow(new Set())}>
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            </section>

            <section aria-labelledby="h-games">
                <div className="section-head">
                    <h2 id="h-games">What every game was worth</h2>
                    <p>Points are what the app shows. Click a game for every move and change.</p>
                </div>
                <Games games={sim.games} sel={sel} onSelect={setSel} />
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
