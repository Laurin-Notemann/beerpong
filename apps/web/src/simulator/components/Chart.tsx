import { type MouseEvent, useRef, useState } from 'react';

import type { Game, Standing } from '~/simulator/api';
import { sgn } from '~/simulator/format';

const W = 1000;
const H = 400;
const m = { l: 52, r: 120, t: 14, b: 34 };
const step = 250;

// Every player's Elo after each game of the season.
export function Chart({
    games,
    standings,
    follow,
    sel,
    onSelect,
}: {
    games: Game[];
    standings: Standing[];
    follow: Set<string>;
    sel: number | null;
    onSelect: (gi: number) => void;
}) {
    const svg = useRef<SVGSVGElement>(null);
    const box = useRef<HTMLDivElement>(null);
    const [hover, setHover] = useState<{ g: number; left: number; top: number }>();

    const G = games.length;
    // lines by profile id
    const names = new Map(standings.map((s) => [s.profileId, s.name]));
    const ids = [...names.keys()];
    const lines = new Map(ids.map((id) => [id, [{ g: 0, v: 1500, played: false }]]));
    games.forEach((g, gi) =>
        g.teams.forEach((t) =>
            t.players.forEach((p) =>
                lines.get(p.profileId)?.push({ g: gi + 1, v: p.after, played: true })
            )
        )
    );
    const all = [...lines.values()].flatMap((pts) => pts.map((p) => p.v));
    const lo = Math.floor((Math.min(...all) - 5) / step) * step;
    const hi = Math.ceil((Math.max(...all) + 5) / step) * step;
    const x = (g: number) => m.l + (g / G) * (W - m.l - m.r);
    const y = (v: number) => m.t + (1 - (v - lo) / (hi - lo)) * (H - m.t - m.b);
    const grid = (hi - lo) / step > 10 ? step * 2 : step;
    const tickEvery = G > 60 ? 10 : G > 25 ? 5 : G > 12 ? 2 : 1;
    const focus = follow.size > 0;
    const last = (n: string) => {
        const pts = lines.get(n)!;
        return pts[pts.length - 1].v;
    };

    const labels = ids.map((n) => ({ n, v: last(n), y: 0 })).sort((a, b) => b.v - a.v);
    let lastY = -Infinity;
    for (const l of labels) {
        l.y = Math.max(y(l.v), lastY + 14);
        lastY = l.y;
    }
    const over = lastY - (H - m.b);
    if (over > 0) for (const l of labels) l.y -= over;

    const gameAt = (ev: MouseEvent) => {
        const r = svg.current!.getBoundingClientRect();
        const px = ((ev.clientX - r.left) / r.width) * W;
        return Math.max(1, Math.min(G, Math.round(((px - m.l) / (W - m.l - m.r)) * G)));
    };
    const onMove = (ev: MouseEvent) => {
        const r = box.current!.getBoundingClientRect();
        let left = ev.clientX - r.left + 14;
        if (left + 240 > r.width) left = ev.clientX - r.left - 254;
        setHover({ g: gameAt(ev), left, top: Math.max(0, ev.clientY - r.top - 40) });
    };

    const ticks: number[] = [];
    for (let v = lo; v <= hi; v += grid) ticks.push(v);
    const gticks: number[] = [];
    for (let g = 0; g <= G; g += tickEvery) gticks.push(g);
    const order = [...ids].sort((a, b) => Number(follow.has(a)) - Number(follow.has(b)));

    return (
        <figure style={{ margin: 0 }}>
            <div
                className="chart"
                ref={box}
                role="img"
                aria-label="Every player's Elo after each game"
            >
                <svg ref={svg} viewBox={`0 0 ${W} ${H}`}>
                    {ticks.map((v) => (
                        <g key={v}>
                            <line
                                x1={m.l}
                                x2={W - m.r}
                                y1={y(v)}
                                y2={y(v)}
                                stroke={v === 1500 ? 'var(--axis)' : 'var(--grid)'}
                            />
                            <text
                                x={m.l - 8}
                                y={y(v) + 4}
                                textAnchor="end"
                                fontSize={12}
                                fill="var(--muted)"
                            >
                                {v}
                            </text>
                        </g>
                    ))}
                    {gticks.map((g) => (
                        <text
                            key={g}
                            x={x(g)}
                            y={H - m.b + 18}
                            textAnchor="middle"
                            fontSize={12}
                            fill="var(--muted)"
                        >
                            {g}
                        </text>
                    ))}
                    <text
                        x={(m.l + W - m.r) / 2}
                        y={H - 2}
                        textAnchor="middle"
                        fontSize={12}
                        fill="var(--muted)"
                    >
                        after game
                    </text>
                    {games.map(
                        (g, gi) =>
                            g.testIndex != null && (
                                <line
                                    key={g.matchId}
                                    x1={x(gi + 1)}
                                    x2={x(gi + 1)}
                                    y1={m.t}
                                    y2={H - m.b}
                                    stroke="var(--scoring)"
                                    strokeDasharray="4 4"
                                />
                            )
                    )}
                    {sel != null && (
                        <rect
                            x={x(sel + 1) - 5}
                            y={m.t}
                            width={10}
                            height={H - m.t - m.b}
                            fill="var(--surface-2)"
                        />
                    )}
                    {order.map((n) => {
                        const pts = lines.get(n)!;
                        const on = follow.has(n);
                        const d =
                            pts
                                .map(
                                    (p, i) =>
                                        `${i ? 'L' : 'M'}${x(p.g).toFixed(1)},${y(p.v).toFixed(1)}`
                                )
                                .join('') + `L${x(G).toFixed(1)},${y(last(n)).toFixed(1)}`;
                        return (
                            <g key={n}>
                                <path
                                    d={d}
                                    fill="none"
                                    stroke={
                                        on
                                            ? 'var(--text)'
                                            : focus
                                              ? 'var(--line-muted)'
                                              : 'var(--muted)'
                                    }
                                    strokeWidth={on ? 2.5 : 1.5}
                                    strokeLinejoin="round"
                                />
                                {on &&
                                    pts
                                        .filter((p) => p.played)
                                        .map((p) => (
                                            <circle
                                                key={p.g}
                                                cx={x(p.g)}
                                                cy={y(p.v)}
                                                r={3.5}
                                                fill="var(--text)"
                                                stroke="var(--surface)"
                                                strokeWidth={2}
                                            />
                                        ))}
                            </g>
                        );
                    })}
                    {labels.map((l) => {
                        const on = follow.has(l.n);
                        return (
                            <text
                                key={l.n}
                                x={W - m.r + 8}
                                y={l.y + 4}
                                fontSize={12}
                                fill={on ? 'var(--text)' : 'var(--text-2)'}
                                fontWeight={on ? 700 : 400}
                            >
                                {names.get(l.n)} {l.v.toFixed(0)}
                            </text>
                        );
                    })}
                    {hover && (
                        <line
                            x1={x(hover.g)}
                            x2={x(hover.g)}
                            y1={m.t}
                            y2={H - m.b}
                            stroke="var(--axis)"
                        />
                    )}
                    <rect
                        x={m.l}
                        y={m.t}
                        width={W - m.l - m.r}
                        height={H - m.t - m.b}
                        fill="transparent"
                        style={{ cursor: 'pointer' }}
                        onMouseMove={onMove}
                        onMouseLeave={() => setHover(undefined)}
                        onClick={(ev) => onSelect(gameAt(ev) - 1)}
                    />
                </svg>
                {hover && games[hover.g - 1] && (
                    <div
                        className="tip"
                        style={{ display: 'block', left: hover.left, top: hover.top }}
                    >
                        <h4>Game {hover.g}</h4>
                        <table>
                            <tbody>
                                {games[hover.g - 1].teams.flatMap((t) =>
                                    t.players.map((p) => (
                                        <tr key={p.profileId}>
                                            <td>
                                                <span className={`wl ${t.won ? 'w' : 'l'}`}>
                                                    {t.won ? 'W' : 'L'}
                                                </span>
                                                {p.name}
                                            </td>
                                            <td className="num">{p.after.toFixed(0)}</td>
                                            <td
                                                className={`num chg ${p.after >= p.before ? 'up' : 'down'}`}
                                            >
                                                {sgn(p.after - p.before)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <figcaption className="hint">
                Everyone starts the season at 1500. A line only moves in games that player played.
            </figcaption>
        </figure>
    );
}
