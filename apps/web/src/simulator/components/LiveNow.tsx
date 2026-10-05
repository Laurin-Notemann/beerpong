import type { Game } from '~/simulator/api';
import { sgn } from '~/simulator/format';

// The games running right now, counted as if they ended now: each player's Elo if the game
// stopped this moment. A click opens the game below.
export function LiveNow({ games, onOpen }: { games: Game[]; onOpen: (gi: number) => void }) {
    const live = games.flatMap((g, gi) => (g.liveMatchId == null ? [] : [{ g, gi }]));
    if (!live.length) return null;
    return (
        <section aria-labelledby="h-live">
            <div className="section-head">
                <h2 id="h-live">
                    <span className="tag live">LIVE</span> Running right now
                </h2>
                <p>
                    Counted as if {live.length === 1 ? 'it' : 'they'} ended now. Until someone
                    finishes, the team with more cups wins and a tie is a draw.
                </p>
            </div>
            <div className="livegrid">
                {live.map(({ g, gi }) => (
                    <button
                        type="button"
                        className="card livecard"
                        key={g.liveMatchId}
                        onClick={() => onOpen(gi)}
                    >
                        {g.teams.map((t, ti) => (
                            <div key={ti} className={`liveteam ${t.won ? 'w' : ''}`}>
                                <span className="cups">{t.cups}</span>
                                {t.players.map((p) => (
                                    <span key={p.profileId} className="liveplayer">
                                        {p.name}{' '}
                                        <span
                                            className={`chg ${p.after >= p.before ? 'up' : 'down'}`}
                                        >
                                            {sgn(p.after - p.before, 0)}
                                        </span>{' '}
                                        <span className="mv">→ {p.after.toFixed(0)}</span>
                                    </span>
                                ))}
                            </div>
                        ))}
                    </button>
                ))}
            </div>
        </section>
    );
}
