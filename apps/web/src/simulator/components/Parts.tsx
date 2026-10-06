import type { Game, Params } from '~/simulator/api';
import { isRing, pct, sgn } from '~/simulator/format';

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
    if (!g) return null;
    const wi = g.teams.findIndex((t) => t.won);
    // a live game that is tied is a draw
    const w = g.teams[Math.max(0, wi)];
    const l = g.teams[wi < 0 ? 1 : 1 - wi];
    if (!w || !l) return null;
    const won = wi < 0 ? 0.5 : 1;

    // the player the game moved most by hitting
    const top = g.teams
        .flatMap((t) => t.players.map((q) => ({ q, t })))
        .sort((a, b) => Math.abs(b.q.hitting) - Math.abs(a.q.hitting))[0];
    if (!top) return null;
    const { q, t } = top;
    const n = t.players.length;
    const inTeam = t.share > 0 ? q.share / t.share : 0;
    const average = g.fullPoints / 2 / n;

    return (
        <section aria-labelledby="h-parts">
            <div className="section-head">
                <h2 id="h-parts">How a game changes a rating</h2>
                <p>
                    Example: game {gi + 1}
                    {g.finisher && `, ${g.finisher} finished with ${g.finishMove}`}
                    {sel == null && ' (click any game to switch)'}.
                </p>
            </div>
            <div className="parts">
                <div className="card part">
                    <h3>Result: same for the whole team</h3>
                    <p className="who">
                        Win or loss against the chance to reach 10 cups first. The ratings say what
                        share of the cups each team hits; the stronger team's chance grows with
                        every cup it takes. A ring win counts more, by the group's ring bonus
                        against its normal finish bonus.
                    </p>
                    <div className="formula">
                        win&nbsp;chance = chance to reach 10 cups first, hitting the team's share of
                        the cups
                        <br />
                        ring = (ring&nbsp;bonus / normal&nbsp;bonus)
                        <sup>
                            <span className="v">{p.ringWeight}</span>
                        </sup>{' '}
                        for a ring win, else 1
                        <br />
                        change = <span className="v">{p.kr}</span> ×{' '}
                        <span className="v">{p.swing}</span> × ring × (won − win&nbsp;chance)
                    </div>
                    <p className="example">
                        {wi < 0 ? 'Tied: a draw counts 0.5. ' : ''}
                        {wi < 0 ? 'The first team' : 'The winners'} expected <b>{pct(w.share)}</b>{' '}
                        of the cups: a <b>{pct(w.winChance)}</b> win chance.{' '}
                        {g.ring !== 1 && (
                            <>
                                A ring win counts <b>×{g.ring.toFixed(2)}</b>.{' '}
                            </>
                        )}
                        {p.kr} × {p.swing}
                        {g.ring !== 1 && ` × ${g.ring.toFixed(2)}`} × ({won} −{' '}
                        {w.winChance.toFixed(2)}) = <b>{sgn(w.players[0]?.result ?? 0)}</b> each,{' '}
                        <b>{sgn(l.players[0]?.result ?? 0)}</b> for each of the others.
                    </p>
                </div>
                <div className="card part s">
                    <h3>Hitting: own points against your share</h3>
                    <p className="who">
                        Before the game, the ratings give every player a share of all the own points
                        (Normal 1, Bomb 2, finish move 1) the game will have: a stronger team gets
                        more, and in it a stronger player. Both teams throw equally often, so on a
                        smaller team each player's share is bigger. What counts is that share of the
                        points the game actually had, so a ring that ends it early or a live game
                        still under way counts alike. The finish bonus only counts in the result.
                    </p>
                    <div className="formula">
                        strength = 10
                        <sup>
                            (rating − 1500) / (<span className="v">{p.spread}</span> × {p.swing})
                        </sup>
                        <br />
                        share = team&nbsp;share × share&nbsp;in&nbsp;team (by strength)
                        <br />
                        expected = share × the&nbsp;game's&nbsp;points
                        <br />
                        average = points&nbsp;of&nbsp;a&nbsp;full&nbsp;game / 2 / team&nbsp;size
                        <br />
                        change = <span className="v">{p.k}</span> ×{' '}
                        <span className="v">{p.swing}</span> × (scored − expected) / average
                    </div>
                    <p className="example">
                        <b>{q.name}</b>'s team expected {pct(t.share)} of the points, {q.name}{' '}
                        {pct(inTeam)} of the team's: a share of <b>{pct(q.share)}</b>. The game had{' '}
                        {g.points} own points, so expected {q.share.toFixed(3)} × {g.points} ={' '}
                        <b>{q.expected.toFixed(1)}</b>. A full game had {g.fullPoints.toFixed(1)} so
                        far this season, so an average player in a team of {n} scores{' '}
                        {average.toFixed(1)}. Scored {q.own}: {p.k} × {p.swing} × ({q.own} −{' '}
                        {q.expected.toFixed(1)}) / {average.toFixed(1)} = <b>{sgn(q.hitting)}</b> on
                        top of the team's {sgn(q.result)}.
                    </p>
                </div>
            </div>
        </section>
    );
}
