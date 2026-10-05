import type { Game, Params } from '~/api';
import { isRing, pct, sgn } from '~/format';

// The two parts of a rating change, with the formulas filled in for one game:
// the selected one, or else the season's first ring.
export function Parts({
    params: p,
    games,
    sel,
}: {
    params: Params;
    games: Game[];
    sel: number | null;
}) {
    let gi = sel ?? games.findIndex((g) => isRing(g.finishMove));
    if (gi < 0) gi = 0;
    const g = games[gi];
    const wi = Math.max(
        0,
        g.teams.findIndex((t) => t.won)
    );
    const w = g.teams[wi];
    const l = g.teams[1 - wi];

    const all = g.teams.flatMap((t) => t.players.map((q) => ({ q, t })));
    const { q, t } = all.sort(
        (a, b) => Math.abs(b.q.own - b.q.expected) - Math.abs(a.q.own - a.q.expected)
    )[0];
    const n = t.players.length;
    const opp = g.teams.find((o) => o !== t)!;
    const perPlayer = g.teamPoints / n;
    const chance = q.expected / (perPlayer * 2);

    return (
        <section aria-labelledby="h-parts">
            <div className="section-head">
                <h2 id="h-parts">How a game changes a rating</h2>
                <p>
                    Example: game {gi + 1}, {g.finisher} finished with {g.finishMove}
                    {sel == null && ' (click any game to switch)'}.
                </p>
            </div>
            <div className="parts">
                <div className="card part">
                    <h3>Result: same for the whole team</h3>
                    <p className="who">
                        Win or loss against the win chance, scaled by how big the win was in the
                        app's points (finish bonus included).
                    </p>
                    <div className="formula">
                        team&nbsp;rating = average + <span className="v">{p.topWeight}</span> ×
                        (best&nbsp;player − average)
                        <br />
                        win&nbsp;chance = 1 / (1 + 10
                        <sup>(their&nbsp;rating − your&nbsp;rating) / 4000</sup>)
                        <br />
                        counts&nbsp;as = ((1 + points&nbsp;gap&nbsp;per&nbsp;player) / 5)
                        <sup>
                            <span className="v">{p.marginWeight}</span>
                        </sup>
                        <br />
                        change = <span className="v">{p.k}</span> × counts&nbsp;as × (won −
                        win&nbsp;chance)
                    </div>
                    <p className="example">
                        Winners rated {w.rating.toFixed(0)} against {l.rating.toFixed(0)}: a{' '}
                        <b>{pct(w.winChance)}</b> win chance. They won by {w.avgPoints.toFixed(1)} −{' '}
                        {l.avgPoints.toFixed(1)} = <b>{g.gap.toFixed(1)}</b> points per player,
                        which counts as <b>×{g.scale.toFixed(2)}</b>: {p.k} × {g.scale.toFixed(2)} ×
                        (1 − {w.winChance.toFixed(2)}) = <b>{sgn(w.players[0].result)}</b> each,{' '}
                        <b>{sgn(l.players[0].result)}</b> for each loser.
                    </p>
                </div>
                <div className="card part s">
                    <h3>Hitting: points above or below what you should score</h3>
                    <p className="who">
                        Before the game, the ratings set how many own points (Normal 1, Bomb 2,
                        finish move 1) you should score: your team's share of an average game this
                        season, more against weaker opponents. Your teammate's points don't matter;
                        the finish bonus only counts in the result.
                    </p>
                    <div className="formula">
                        expected = team&nbsp;points&nbsp;per&nbsp;game / team&nbsp;size × 2 ×
                        your&nbsp;win&nbsp;chance&nbsp;vs&nbsp;them
                        <br />
                        change = team&nbsp;result + <span className="v">{p.perPoint}</span> ×
                        (scored − expected)
                    </div>
                    <p className="example">
                        Teams scored <b>{g.teamPoints.toFixed(1)}</b> own points per game so far
                        this season, so {perPlayer.toFixed(1)} per player in a team of {n}.{' '}
                        <b>{q.name}</b> ({q.before.toFixed(0)}) had a {pct(chance)} chance against
                        the opponents ({opp.rating.toFixed(0)}): expected {perPlayer.toFixed(1)} × 2
                        × {chance.toFixed(2)} = <b>{q.expected.toFixed(1)}</b>. Scored {q.own}:{' '}
                        {p.perPoint} × ({q.own} − {q.expected.toFixed(1)}) = <b>{sgn(q.hitting)}</b>{' '}
                        on top of the team's {sgn(q.result)}.
                    </p>
                </div>
            </div>
        </section>
    );
}
