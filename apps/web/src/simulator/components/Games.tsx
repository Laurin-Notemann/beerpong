import { Fragment, useEffect, useRef } from 'react';

import type { Game, GameTeam } from '~/simulator/api';
import { isRing, pct, sgn, shortMove, when } from '~/simulator/format';

// Every game of the season with what it was worth; a click opens its moves
// and each player's change. Test games sit between the real ones.
export function Games({
    games,
    sel,
    onSelect,
    onAdd,
    onEdit,
    onRemove,
}: {
    games: Game[];
    sel: number | null;
    onSelect: (gi: number | null) => void;
    // a new test game right after this game, or at the start or the end
    onAdd: (after: Game | 'start' | 'end') => void;
    onEdit: (testIndex: number) => void;
    onRemove: (testIndex: number) => void;
}) {
    // real games keep their numbers when test and live games come in between
    let real = 0;
    let live = 0;
    const numbers = games.map((g) =>
        g.liveMatchId != null
            ? `L${++live}`
            : g.testIndex == null
              ? String(++real)
              : `T${g.testIndex + 1}`
    );
    // games that arrived live since the season was opened flash once
    const seen = useRef(new Set(games.map((g) => g.matchId)));
    useEffect(() => {
        for (const g of games) seen.current.add(g.matchId);
    }, [games]);

    return (
        <div className="card tbl-wrap">
            <div className="gamesbar">
                <button type="button" className="icon" onClick={() => onAdd('start')}>
                    + Test game at the start
                </button>
                <button type="button" className="icon" onClick={() => onAdd('end')}>
                    + Test game at the end
                </button>
                <span className="hint" style={{ margin: 0 }}>
                    or + on a game to put one right after it
                </span>
            </div>
            <table className="games" id="games">
                <thead>
                    <tr>
                        <th className="num">#</th>
                        <th>Teams (points)</th>
                        <th className="num">Cups</th>
                        <th>Finish</th>
                        <th className="num">Gap / player</th>
                        <th className="num">Counts as</th>
                        <th className="num">Winner's chance</th>
                        <th className="num">Result</th>
                        <th />
                    </tr>
                </thead>
                <tbody>
                    {games.map((g, gi) => {
                        const wi = Math.max(
                            0,
                            g.teams.findIndex((t) => t.won)
                        );
                        const w = g.teams[wi];
                        const l = g.teams[1 - wi];
                        const open = sel === gi;
                        const toggle = () => onSelect(open ? null : gi);
                        return (
                            <Fragment key={g.matchId}>
                                <tr
                                    data-g={gi}
                                    tabIndex={0}
                                    className={[
                                        open ? 'sel' : '',
                                        seen.current.has(g.matchId) ? '' : 'new',
                                        g.testIndex == null ? '' : 'test',
                                        g.liveMatchId == null ? '' : 'live',
                                    ].join(' ')}
                                    aria-expanded={open}
                                    onClick={toggle}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            toggle();
                                        }
                                    }}
                                >
                                    <td className="num">
                                        {numbers[gi]}
                                        {g.liveMatchId != null ? (
                                            <span className="when">
                                                <span className="tag live">LIVE</span>
                                            </span>
                                        ) : g.testIndex == null ? (
                                            // the server renders UTC, the browser local time
                                            <span className="when" suppressHydrationWarning>
                                                {when(g.date)}
                                            </span>
                                        ) : (
                                            <span className="when">
                                                <span className="tag">TEST</span>
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="teams">
                                            {g.teams.map((t, ti) => (
                                                <TeamLabel key={ti} team={t} />
                                            ))}
                                        </div>
                                    </td>
                                    <td className="num">
                                        <span className="cupscore">
                                            {w.cups}:{l.cups}
                                        </span>
                                    </td>
                                    <td>
                                        <span
                                            className={`fin ${isRing(g.finishMove) ? 'ring' : ''}`}
                                        >
                                            {g.finisher || (g.liveMatchId != null && 'in progress')}{' '}
                                            <span className="mv">{shortMove(g.finishMove)}</span>
                                        </span>
                                    </td>
                                    <td className="num">{g.gap.toFixed(1)}</td>
                                    <td className="num">
                                        <span className="scale">×{g.scale.toFixed(2)}</span>
                                    </td>
                                    <td className="num">{pct(w.winChance)}</td>
                                    <td className="num">
                                        <span className="chg up">
                                            {sgn(w.players[0]?.result ?? 0)}
                                        </span>{' '}
                                        /{' '}
                                        <span className="chg down">
                                            {sgn(l.players[0]?.result ?? 0)}
                                        </span>
                                    </td>
                                    {/* the buttons don't open the game */}
                                    <td
                                        className="rowbtns"
                                        onClick={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => e.stopPropagation()}
                                    >
                                        {g.testIndex != null && (
                                            <>
                                                <button
                                                    type="button"
                                                    className="icon"
                                                    onClick={() => onEdit(g.testIndex!)}
                                                >
                                                    Edit
                                                </button>{' '}
                                                <button
                                                    type="button"
                                                    className="icon"
                                                    aria-label="Remove test game"
                                                    onClick={() => onRemove(g.testIndex!)}
                                                >
                                                    ×
                                                </button>{' '}
                                            </>
                                        )}
                                        {g.liveMatchId == null && (
                                            <button
                                                type="button"
                                                className="icon"
                                                title="A test game right after this one"
                                                aria-label={`Test game after game ${numbers[gi]}`}
                                                onClick={() => onAdd(g)}
                                            >
                                                +
                                            </button>
                                        )}
                                    </td>
                                </tr>
                                {open && (
                                    <tr className="detail">
                                        <td colSpan={9}>
                                            <Inspector game={g} />
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function TeamLabel({ team }: { team: GameTeam }) {
    return (
        <div className={`t ${team.won ? 'w' : ''}`}>
            <span className={`wl ${team.won ? 'w' : 'l'}`}>{team.won ? 'W' : 'L'}</span>
            {team.players.map((p, i) => (
                <Fragment key={p.profileId}>
                    {i > 0 && ', '}
                    {p.name} <span className="pts">{p.points}</span>
                </Fragment>
            ))}
        </div>
    );
}

function Inspector({ game }: { game: Game }) {
    const players = game.teams.flatMap((t) => t.players);
    const scale = Math.max(
        12,
        ...players.flatMap((p) => [Math.abs(p.result), Math.abs(p.hitting)])
    );
    const scaleMax = Math.max(1, ...players.flatMap((p) => [p.own, p.expected]));
    const tick = (v: number, cls: string) => (
        <div
            className={cls}
            style={{ left: `calc(${Math.min(100, (v / scaleMax) * 100)}% - 1px)` }}
        />
    );
    const half = (v: number, cls: string) => {
        const bar = (
            <div
                className={`bar ${cls}`}
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
    };
    return (
        <>
            <div className="inspector">
                {game.teams.map((t, ti) => {
                    return (
                        <div className="teamcard" key={ti}>
                            <h4>
                                <span className={`wl ${t.won ? 'w' : 'l'}`}>
                                    {t.won ? 'WON' : 'LOST'}
                                </span>{' '}
                                {t.points} points · {t.avgPoints.toFixed(1)} per player · {t.cups}{' '}
                                cups
                            </h4>
                            <div className="meta">
                                Team rating {t.rating.toFixed(0)} → <b>{pct(t.winChance)}</b> win
                                chance
                                {t.won &&
                                    `, won by ${game.gap.toFixed(1)} points per player (counts ×${game.scale.toFixed(2)})`}{' '}
                                → result{' '}
                                <b style={{ color: 'var(--result)' }}>
                                    {sgn(t.players[0]?.result ?? 0)}
                                </b>{' '}
                                each
                            </div>
                            {t.players.map((p) => {
                                const moves = [...p.moves].sort(
                                    (a, b) =>
                                        Number(/^Finish/.test(a.name)) -
                                        Number(/^Finish/.test(b.name))
                                );
                                return (
                                    <div className="prow" key={p.profileId}>
                                        <div className="nm">
                                            {p.name}
                                            <small>
                                                {p.before.toFixed(0)} → {p.after.toFixed(0)}
                                            </small>
                                            <span className="moves">
                                                {moves.length
                                                    ? moves.map((mv, i) => (
                                                          <Fragment key={mv.name}>
                                                              {i > 0 && ', '}
                                                              <span
                                                                  className={
                                                                      isRing(mv.name) ? 'ring' : ''
                                                                  }
                                                              >
                                                                  {mv.count} {mv.name}
                                                              </span>
                                                          </Fragment>
                                                      ))
                                                    : 'no hits'}
                                            </span>
                                        </div>
                                        <div>
                                            <div className="share">
                                                <div
                                                    className="act"
                                                    style={{
                                                        width: `${Math.min(100, (p.own / scaleMax) * 100)}%`,
                                                    }}
                                                />
                                                {tick(p.expected, 'exp')}
                                                {game.share < 1 &&
                                                    tick(p.expected * game.share, 'exp part')}
                                            </div>
                                            <div className="share-lbl">
                                                scored {p.own} · expected {p.expected.toFixed(1)}
                                                {game.share < 1 &&
                                                    ` · ${(p.expected * game.share).toFixed(1)} counted for ${pct(game.share)} of a game`}
                                            </div>
                                        </div>
                                        <div className="deltas">
                                            <div className="drow">
                                                {half(p.result, 'r')}
                                                <span
                                                    className="val"
                                                    style={{ color: 'var(--result)' }}
                                                >
                                                    {sgn(p.result)}
                                                </span>
                                            </div>
                                            <div className="drow">
                                                {half(p.hitting, 's')}
                                                <span
                                                    className="val"
                                                    style={{ color: 'var(--scoring)' }}
                                                >
                                                    {sgn(p.hitting)}
                                                </span>
                                            </div>
                                        </div>
                                        <div
                                            className={`total chg ${p.after >= p.before ? 'up' : 'down'}`}
                                        >
                                            {sgn(p.after - p.before)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
            <div className="hint">
                “Scored” is own points; the finish bonus goes to everyone and only counts in the
                result. Orange bar: own points; tick: what the ratings expected for a full game, set
                before it. A ring ends the game early and a live game is as far as the team with
                more cups, so only that part counts (faint tick).{' '}
                <span style={{ color: 'var(--result)' }}>Blue</span> = team result,{' '}
                <span style={{ color: 'var(--scoring)' }}>orange</span> = hitting: Elo per point ×
                (scored − counted expectation).
            </div>
        </>
    );
}
