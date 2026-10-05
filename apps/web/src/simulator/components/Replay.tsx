import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react';

import { type Game, getReplay, type Simulation } from '~/simulator/api';
import { pct, sgn, shortMove, when } from '~/simulator/format';
import {
    CUP_FORMATION,
    type CupPosition,
    type CupTeam,
    findHit,
    type LiveMatchDto,
    replaySteps,
} from '~/simulator/liveMatch';

const sides: CupTeam[] = ['blue', 'red'];
const sideName = { blue: 'Blue', red: 'Red' };
// the API takes at most this many steps
const maxSteps = 300;

type Step = ReturnType<typeof replaySteps>[number];

/**
 * A finished live match, replayed throw by throw: every step rated by the API as if the game had
 * stopped there, with the weights above, and the stored match last. Only shows what the API
 * computes; the steps come from the match's live log, reduced with the app's code.
 */
export function Replay({
    sim,
    code,
    replays,
}: {
    sim: Simulation;
    code: string;
    // the season's finished live matches, newest first, each with its stored game
    replays: { dto: LiveMatchDto; game: Game }[];
}) {
    const [id, setId] = useState('');
    const picked = replays.find((r) => r.dto.id === id);
    const steps = useMemo(
        () => (picked ? replaySteps(picked.dto).slice(0, maxSteps) : []),
        [picked?.dto]
    );
    const matchId = picked?.dto.resultMatchId;
    const [games, setGames] = useState<Game[]>();
    const [error, setError] = useState<string>();
    const [at, setAt] = useState(0);
    const [playing, setPlaying] = useState(false);

    // rated again when the weights change
    const { k, kr, ringWeight, swing } = sim.params;
    useEffect(() => {
        if (!matchId || !sim.seasonId || !steps.length) return;
        let stale = false;
        setError(undefined);
        getReplay({
            data: {
                code,
                season: sim.seasonId,
                params: { k, kr, ringWeight, swing },
                matchId,
                steps: steps.map((s) => s.step),
            },
        })
            .then((g) => {
                if (stale) return;
                if (g.length === steps.length + 1) setGames(g);
                else setError('the API rated a different number of steps');
            })
            .catch((e: unknown) => {
                if (!stale) setError(e instanceof Error ? e.message : String(e));
            });
        return () => {
            stale = true;
        };
    }, [code, sim.seasonId, matchId, steps, k, kr, ringWeight, swing]);

    const last = steps.length;
    const step = Math.min(at, last);
    useEffect(() => {
        if (!playing) return;
        if (step >= last) {
            setPlaying(false);
            return;
        }
        const t = setTimeout(() => setAt(step + 1), 1000);
        return () => clearTimeout(t);
    }, [playing, step, last]);

    const ready = games && games.length === steps.length + 1 ? games : undefined;

    return (
        <section aria-labelledby="h-replay">
            <div className="section-head">
                <h2 id="h-replay">Replay a game, throw by throw</h2>
                <p>
                    A game entered live, rated after every throw as if it had ended there, with the
                    weights above.
                </p>
            </div>
            <div className="card replay">
                <div className="replay-controls">
                    <select
                        aria-label="Game"
                        value={id}
                        onChange={(e) => {
                            setId(e.target.value);
                            setGames(undefined);
                            setError(undefined);
                            setAt(0);
                            setPlaying(false);
                        }}
                    >
                        <option value="">Pick a game…</option>
                        {replays.map(({ dto, game }) => (
                            <option key={dto.id} value={dto.id}>
                                {when(game.date)} ·{' '}
                                {game.teams
                                    .map((t) => t.players.map((p) => p.name).join(', '))
                                    .join(' vs ')}
                            </option>
                        ))}
                    </select>
                    {picked && (
                        <>
                            <div className="replay-btns">
                                <button
                                    type="button"
                                    className="icon"
                                    aria-label="First step"
                                    disabled={!ready || step === 0}
                                    onClick={() => setAt(0)}
                                >
                                    ⏮
                                </button>
                                <button
                                    type="button"
                                    className="icon"
                                    aria-label="Step back"
                                    disabled={!ready || step === 0}
                                    onClick={() => setAt(step - 1)}
                                >
                                    ◀
                                </button>
                                <button
                                    type="button"
                                    className="icon play"
                                    disabled={!ready}
                                    onClick={() => {
                                        if (!playing && step >= last) setAt(0);
                                        setPlaying(!playing);
                                    }}
                                >
                                    {playing ? '❚❚ Pause' : '▶ Play'}
                                </button>
                                <button
                                    type="button"
                                    className="icon"
                                    aria-label="Step forward"
                                    disabled={!ready || step >= last}
                                    onClick={() => setAt(step + 1)}
                                >
                                    ▶
                                </button>
                                <button
                                    type="button"
                                    className="icon"
                                    aria-label="Last step"
                                    disabled={!ready || step >= last}
                                    onClick={() => setAt(last)}
                                >
                                    ⏭
                                </button>
                            </div>
                            <input
                                type="range"
                                aria-label="Step"
                                min={0}
                                max={last}
                                value={step}
                                disabled={!ready}
                                onChange={(e) => {
                                    setPlaying(false);
                                    setAt(Number(e.target.value));
                                }}
                            />
                        </>
                    )}
                </div>
                {picked &&
                    (error ? (
                        <p className="err">This game couldn't be replayed: {error}</p>
                    ) : !ready ? (
                        <p className="hint">Rating every step…</p>
                    ) : (
                        <Steps
                            sim={sim}
                            steps={steps}
                            games={ready}
                            at={step}
                            onStep={(s) => {
                                setPlaying(false);
                                setAt(s);
                            }}
                        />
                    ))}
            </div>
        </section>
    );
}

// The replay at one step: the table, the breakdown and the hitting over every step.
function Steps({
    sim,
    steps,
    games,
    at,
    onStep,
}: {
    sim: Simulation;
    steps: Step[];
    games: Game[];
    at: number;
    onStep: (step: number) => void;
}) {
    const last = steps.length;
    const game = games[at];
    // the stored match is drawn like the last step of its log
    const view = steps[Math.min(at, last - 1)];
    const op = at < last ? view.op : undefined;

    // a step's players are the API's game's players, in the same order
    const playerOf = new Map<string, Game['teams'][number]['players'][number]>();
    steps.forEach((s, si) =>
        s.step.teams.forEach((t, ti) =>
            t.teamMembers?.forEach((m, mi) => {
                const p = games[si].teams[ti]?.players[mi];
                if (m.playerId && p) playerOf.set(m.playerId, p);
            })
        )
    );
    // shades of the team's colour, by the player's place in the stored match
    const colors = new Map<string, string>();
    games[last].teams.forEach((t, ti) =>
        t.players.forEach((p, i) => colors.set(p.profileId, `var(--p-${sides[ti]}-${i % 3})`))
    );
    const color = (profileId: string) => colors.get(profileId) ?? 'var(--muted)';
    const moveName = (moveId: string) =>
        shortMove(sim.moves.find((m) => m.id === moveId)?.name) || 'a move';
    const nameOf = (playerId: string) => playerOf.get(playerId)?.name ?? 'Someone';

    // what happened at a step
    const label = (s: number) => {
        const o = s < last ? steps[s].op : undefined;
        if (s === last) return 'final, as stored';
        if (!o) return 'before the first throw';
        if (o.type === 'UNDO_CUP_HIT') return `a hit on ${sideName[o.team]}'s cups is taken back`;
        if (o.type === 'ADJUST_MOVE') {
            const by = `${o.delta > 0 ? '+' : '−'}${Math.abs(o.delta)}`;
            return `${nameOf(o.playerId)} ${by} ${moveName(o.moveId)} (entered by hand)`;
        }
        const cups = o.cups.length === 1 ? 'a cup' : `${o.cups.length} cups`;
        const finish = o.finishMoveId ? ` · ${moveName(o.finishMoveId)}` : '';
        return `${nameOf(o.playerId)} hits ${cups} · ${moveName(o.moveId)}${finish}`;
    };
    const thrower =
        op && op.type !== 'UNDO_CUP_HIT' ? playerOf.get(op.playerId)?.profileId : undefined;
    const marked =
        op?.type === 'RECORD_CUP_HIT'
            ? { team: op.team, cups: op.cups }
            : op?.type === 'UNDO_CUP_HIT'
              ? { team: op.team, cups: [op.cup] }
              : undefined;

    const scale = Math.max(
        10,
        ...games.flatMap((g) => g.teams.flatMap((t) => t.players.map((p) => Math.abs(p.hitting))))
    );

    return (
        <>
            <div className="replay-step">
                <b>
                    Step {at} / {last}
                </b>{' '}
                · {label(at)}
            </div>
            <div className="replay-grid">
                <div>
                    <div className="replay-score">
                        {game.teams.map((t, ti) => (
                            <span key={ti} className={sides[ti]}>
                                {sideName[sides[ti]]} <b>{t.cups}</b> cups
                                {ti === 0 && ' · '}
                            </span>
                        ))}
                    </div>
                    <Table
                        game={game}
                        state={view.state}
                        marked={marked}
                        thrower={thrower}
                        color={color}
                    />
                </div>
                <div className="breakdown">
                    <Slices game={game} color={color} />
                    <table className="replay-rows">
                        <thead>
                            <tr>
                                <th>Player</th>
                                <th className="num">Points</th>
                                <th className="num">Expected</th>
                                <th>Hitting so far</th>
                                <th className="num">Result</th>
                                <th className="num">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {game.teams.flatMap((t) =>
                                t.players.map((p) => (
                                    <tr
                                        key={p.profileId}
                                        className={p.profileId === thrower ? 'sel' : ''}
                                    >
                                        <td>
                                            <i
                                                className="dot"
                                                style={{ background: color(p.profileId) }}
                                            />
                                            {p.name}
                                        </td>
                                        <td className="num">{p.own}</td>
                                        <td className="num">{p.expected.toFixed(1)}</td>
                                        <td>
                                            <div className="drow">
                                                <Half v={p.hitting} scale={scale} />
                                                <span
                                                    className="val"
                                                    style={{ color: 'var(--scoring)' }}
                                                >
                                                    {sgn(p.hitting)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="num" style={{ color: 'var(--result)' }}>
                                            {sgn(p.result)}
                                        </td>
                                        <td
                                            className={`num total chg ${p.after >= p.before ? 'up' : 'down'}`}
                                        >
                                            {sgn(p.after - p.before)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <HittingChart games={games} at={at} color={color} what={label} onStep={onStep} />
            <p className="hint">
                Hitting so far is what the game would give if it ended at that step; until then the
                result counts the team ahead in cups as winning, and a tie as a draw. The last step
                is the match as stored: the real winner
                {games[last].ring !== 1 &&
                    `, and its ring win counted ×${games[last].ring.toFixed(2)}`}
                .
            </p>
        </>
    );
}

function Half({ v, scale }: { v: number; scale: number }) {
    const bar = (
        <div
            className="bar s"
            style={{ width: `${Math.min(100, (Math.abs(v) / scale) * 100)}%` }}
        />
    );
    return v < 0 ? (
        <>
            <div className="half neg">{bar}</div>
            <div className="half zero" />
        </>
    ) : (
        <>
            <div className="half neg" />
            <div className="half zero">{bar}</div>
        </>
    );
}

// The game's points as slices, set before it: each team's, then each player's.
function Slices({ game, color }: { game: Game; color: (profileId: string) => string }) {
    return (
        <div className="slices" aria-label="Each team's and player's share of the game's points">
            <div className="slices-row">
                {game.teams.map((t, ti) => (
                    <div
                        key={ti}
                        className={`slice team ${sides[ti]}`}
                        style={{ width: `${t.share * 100}%` }}
                    >
                        {sideName[sides[ti]]} {pct(t.share)}
                    </div>
                ))}
            </div>
            <div className="slices-row">
                {game.teams.flatMap((t) =>
                    t.players.map((p) => (
                        <div
                            key={p.profileId}
                            className="slice"
                            style={{ width: `${p.share * 100}%`, background: color(p.profileId) }}
                            title={`${p.name} ${pct(p.share)}`}
                        >
                            {p.name} {pct(p.share)}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// The table from above: blue's cups on the left, red's on the right, each pyramid's apex to the
// centre, and each team's players outside its end.
const TW = 900;
const TH = 260;
const table = { l: 190, r: 710, t: 10, b: 250 };
const midY = (table.t + table.b) / 2;
// grid units: x runs across the table, y from the team's end to the centre
const ux = 17;
const uy = 15;
const cupR = 14;

function cupAt(side: CupTeam, cup: CupPosition) {
    const depth = 26 + cup.y * uy;
    return {
        cx: side === 'blue' ? table.l + depth : table.r - depth,
        cy: midY + (cup.x - 3) * ux,
    };
}

function Table({
    game,
    state,
    marked,
    thrower,
    color,
}: {
    game: Game;
    state: Step['state'];
    marked?: { team: CupTeam; cups: CupPosition[] };
    thrower?: string;
    color: (profileId: string) => string;
}) {
    const isMarked = (side: CupTeam, cup: CupPosition) =>
        marked?.team === side && marked.cups.some((c) => c.x === cup.x && c.y === cup.y);
    return (
        <svg
            className="replay-table"
            viewBox={`0 0 ${TW} ${TH}`}
            role="img"
            aria-label="The table: each team's cups, standing or hit"
        >
            <rect
                x={table.l}
                y={table.t}
                width={table.r - table.l}
                height={table.b - table.t}
                rx={18}
                fill="var(--table)"
            />
            <line
                x1={(table.l + table.r) / 2}
                x2={(table.l + table.r) / 2}
                y1={table.t + 8}
                y2={table.b - 8}
                stroke="var(--table-line)"
                strokeDasharray="6 6"
            />
            {sides.map((side) =>
                CUP_FORMATION.cups.map((cup) => {
                    const { cx, cy } = cupAt(side, cup);
                    const hit = findHit(state.cupHits, side, cup);
                    return (
                        <g key={`${side}-${cup.x}-${cup.y}`}>
                            <circle
                                cx={cx}
                                cy={cy}
                                r={cupR}
                                fill={hit ? 'none' : `var(--team-${side})`}
                                stroke={hit ? 'var(--table-line)' : 'none'}
                                strokeWidth={1.5}
                                strokeDasharray={hit ? '3 3' : undefined}
                            />
                            {isMarked(side, cup) && (
                                <circle
                                    cx={cx}
                                    cy={cy}
                                    r={cupR + 3}
                                    fill="none"
                                    stroke="#fff"
                                    strokeWidth={3}
                                />
                            )}
                        </g>
                    );
                })
            )}
            {game.teams.map((t, ti) => {
                const side = sides[ti];
                const n = t.players.length;
                return t.players.map((p, i) => {
                    const y = midY + (i - (n - 1) / 2) * 26;
                    const dotX = side === 'blue' ? table.l - 14 : table.r + 14;
                    const on = p.profileId === thrower;
                    return (
                        <g key={p.profileId}>
                            <circle
                                cx={dotX}
                                cy={y}
                                r={on ? 7 : 5}
                                fill={color(p.profileId)}
                                stroke={on ? 'var(--text)' : 'none'}
                                strokeWidth={2}
                            />
                            <text
                                x={side === 'blue' ? dotX - 14 : dotX + 14}
                                y={y + 5}
                                textAnchor={side === 'blue' ? 'end' : 'start'}
                                fontSize={14}
                                fill={on ? 'var(--text)' : 'var(--text-2)'}
                                fontWeight={on ? 700 : 400}
                            >
                                {p.name}
                                <tspan dx={8} fontWeight={700} fill="var(--text)">
                                    {p.own}
                                </tspan>
                            </text>
                        </g>
                    );
                });
            })}
        </svg>
    );
}

// Every player's hitting after each step; hover for the numbers, click to jump there.
const CW = 900;
const CH = 220;
const cm = { l: 44, r: 110, t: 12, b: 28 };

function HittingChart({
    games,
    at,
    color,
    what,
    onStep,
}: {
    games: Game[];
    at: number;
    color: (profileId: string) => string;
    what: (step: number) => string;
    onStep: (step: number) => void;
}) {
    const svg = useRef<SVGSVGElement>(null);
    const box = useRef<HTMLDivElement>(null);
    const [hover, setHover] = useState<{ s: number; left: number; top: number }>();
    const last = games.length - 1;

    const lines = new Map<string, { name: string; pts: { s: number; v: number }[] }>();
    games.forEach((g, s) =>
        g.teams.forEach((t) =>
            t.players.forEach((p) => {
                const line = lines.get(p.profileId) ?? { name: p.name, pts: [] };
                line.pts.push({ s, v: p.hitting });
                lines.set(p.profileId, line);
            })
        )
    );
    const all = [...lines.values()].flatMap((l) => l.pts.map((p) => p.v));
    const top = Math.max(10, ...all.map(Math.abs));
    const x = (s: number) => cm.l + (last ? s / last : 0) * (CW - cm.l - cm.r);
    const y = (v: number) => cm.t + (1 - (v + top) / (2 * top)) * (CH - cm.t - cm.b);

    // names at the lines' ends, pushed apart
    const labels = [...lines.entries()]
        .map(([id, l]) => ({ id, name: l.name, v: l.pts[l.pts.length - 1].v, y: 0 }))
        .sort((a, b) => b.v - a.v);
    let prev = -Infinity;
    for (const l of labels) {
        l.y = Math.max(y(l.v), prev + 14);
        prev = l.y;
    }

    const stepAt = (ev: MouseEvent) => {
        const r = svg.current!.getBoundingClientRect();
        const px = ((ev.clientX - r.left) / r.width) * CW;
        return Math.max(0, Math.min(last, Math.round(((px - cm.l) / (CW - cm.l - cm.r)) * last)));
    };
    const onMove = (ev: MouseEvent) => {
        const r = box.current!.getBoundingClientRect();
        let left = ev.clientX - r.left + 14;
        if (left + 220 > r.width) left = ev.clientX - r.left - 234;
        setHover({ s: stepAt(ev), left, top: Math.max(0, ev.clientY - r.top - 40) });
    };
    const tickEvery = last > 60 ? 10 : last > 25 ? 5 : last > 12 ? 2 : 1;
    const ticks: number[] = [];
    for (let s = 0; s <= last; s += tickEvery) ticks.push(s);

    return (
        <div className="chart replay-chart" ref={box}>
            <svg ref={svg} viewBox={`0 0 ${CW} ${CH}`} role="img" aria-label="Hitting per step">
                {[top, 0, -top].map((v) => (
                    <g key={v}>
                        <line
                            x1={cm.l}
                            x2={CW - cm.r}
                            y1={y(v)}
                            y2={y(v)}
                            stroke={v === 0 ? 'var(--axis)' : 'var(--grid)'}
                        />
                        <text
                            x={cm.l - 8}
                            y={y(v) + 4}
                            textAnchor="end"
                            fontSize={12}
                            fill="var(--muted)"
                        >
                            {v === 0 ? 0 : sgn(v, 0)}
                        </text>
                    </g>
                ))}
                {ticks.map((s) => (
                    <text
                        key={s}
                        x={x(s)}
                        y={CH - cm.b + 18}
                        textAnchor="middle"
                        fontSize={12}
                        fill="var(--muted)"
                    >
                        {s}
                    </text>
                ))}
                <line
                    x1={x(at)}
                    x2={x(at)}
                    y1={cm.t}
                    y2={CH - cm.b}
                    stroke="var(--text-2)"
                    strokeDasharray="4 4"
                />
                {[...lines.entries()].map(([id, l]) => (
                    <path
                        key={id}
                        d={l.pts
                            .map(
                                (p, i) =>
                                    `${i ? 'L' : 'M'}${x(p.s).toFixed(1)},${y(p.v).toFixed(1)}`
                            )
                            .join('')}
                        fill="none"
                        stroke={color(id)}
                        strokeWidth={2}
                        strokeLinejoin="round"
                    />
                ))}
                {[...lines.entries()].map(([id, l]) => {
                    const p = l.pts.find((q) => q.s === at);
                    return (
                        p && (
                            <circle
                                key={id}
                                cx={x(p.s)}
                                cy={y(p.v)}
                                r={4}
                                fill={color(id)}
                                stroke="var(--surface)"
                                strokeWidth={2}
                            />
                        )
                    );
                })}
                {labels.map((l) => (
                    <text
                        key={l.id}
                        x={CW - cm.r + 8}
                        y={l.y + 4}
                        fontSize={12}
                        fill="var(--text-2)"
                    >
                        <tspan fill={color(l.id)}>●</tspan> {l.name}
                    </text>
                ))}
                {hover && (
                    <line
                        x1={x(hover.s)}
                        x2={x(hover.s)}
                        y1={cm.t}
                        y2={CH - cm.b}
                        stroke="var(--axis)"
                    />
                )}
                <rect
                    x={cm.l}
                    y={cm.t}
                    width={CW - cm.l - cm.r}
                    height={CH - cm.t - cm.b}
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onMouseMove={onMove}
                    onMouseLeave={() => setHover(undefined)}
                    onClick={(ev) => onStep(stepAt(ev))}
                />
            </svg>
            {hover && games[hover.s] && (
                <div className="tip" style={{ display: 'block', left: hover.left, top: hover.top }}>
                    <h4>
                        Step {hover.s}: {what(hover.s)}
                    </h4>
                    <table>
                        <tbody>
                            {games[hover.s].teams.flatMap((t) =>
                                t.players.map((p) => (
                                    <tr key={p.profileId}>
                                        <td>
                                            <i
                                                className="dot"
                                                style={{ background: color(p.profileId) }}
                                            />
                                            {p.name}
                                        </td>
                                        <td className="num">{p.own}</td>
                                        <td className="num chg" style={{ color: 'var(--text)' }}>
                                            {sgn(p.hitting)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            <div className="hint" style={{ marginTop: 0 }}>
                Hitting so far, after every step (0: before the first throw, {last}: as stored).
            </div>
        </div>
    );
}
