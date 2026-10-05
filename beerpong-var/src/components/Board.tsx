import { Fragment } from 'react';

import type { Standing } from '~/api';
import { plural, sgn } from '~/format';

// The season's leaderboard as the app shows it: players with the season's
// minimum of matches ranked, the others below. "vs" compares with the
// baseline: the default weights, or the season without test and live games.
export function Board({
    standings,
    baseline,
    unchanged,
    minMatches,
    follow,
    onToggle,
}: {
    standings: Standing[];
    baseline: 'defaults' | 'storedGames';
    // nothing to compare: default weights and no test games
    unchanged: boolean;
    minMatches: number;
    follow: Set<string>;
    onToggle: (profileId: string) => void;
}) {
    const scale = Math.max(
        ...standings.map((s) => Math.max(Math.abs(s.result), Math.abs(s.hitting))),
        1
    );
    const firstUnranked = standings.findIndex((s) => s.rank == null);
    return (
        <div className="card tbl-wrap">
            <table>
                <thead>
                    <tr>
                        <th className="num">#</th>
                        <th>Player</th>
                        <th className="num">Elo</th>
                        <th className="num">
                            {baseline === 'defaults' ? 'vs defaults' : 'vs saved games'}
                        </th>
                        <th className="num">Games</th>
                        <th className="num">Won</th>
                        <th className="num">Points</th>
                        <th className="num">Avg</th>
                        <th>Where the Elo came from</th>
                    </tr>
                </thead>
                <tbody>
                    {standings.map((s, i) => (
                        <Fragment key={s.profileId}>
                            {i === firstUnranked && (
                                <tr className="unranked-head">
                                    <td colSpan={9}>
                                        Unranked{' '}
                                        <span>
                                            · {plural(minMatches, 'game')} required to qualify
                                        </span>
                                    </td>
                                </tr>
                            )}
                            <tr
                                tabIndex={0}
                                className={[
                                    follow.has(s.profileId) ? 'hl' : '',
                                    s.rank == null ? 'unranked' : '',
                                ].join(' ')}
                                onClick={() => onToggle(s.profileId)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        onToggle(s.profileId);
                                    }
                                }}
                            >
                                <td className="num rank">{s.rank ?? '–'}</td>
                                <td>
                                    <b>{s.name}</b>
                                </td>
                                <td className="num elo">{s.elo.toFixed(0)}</td>
                                <td className="num">
                                    {unchanged ? (
                                        <span className="chg same">–</span>
                                    ) : s.baselineElo == null ? (
                                        <span className="chg up">new</span>
                                    ) : (
                                        <>
                                            {s.rank != null &&
                                                (s.baselineRank == null ? (
                                                    <span className="chg up">ranked</span>
                                                ) : (
                                                    <RankChange delta={s.baselineRank - s.rank} />
                                                ))}{' '}
                                            <span className="chg same">
                                                {sgn(s.elo - s.baselineElo, 0)}
                                            </span>
                                        </>
                                    )}
                                </td>
                                <td className="num">{s.matches}</td>
                                <td className="num">{s.wins}</td>
                                <td className="num">{s.points}</td>
                                <td className="num">{(s.points / s.matches).toFixed(1)}</td>
                                <td>
                                    <SplitBar result={s.result} hitting={s.hitting} scale={scale} />
                                    <div className="share-lbl">
                                        <span style={{ color: 'var(--result)' }}>
                                            {sgn(s.result)}
                                        </span>{' '}
                                        ·{' '}
                                        <span style={{ color: 'var(--scoring)' }}>
                                            {sgn(s.hitting)}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        </Fragment>
                    ))}
                </tbody>
            </table>
            <div className="hint">
                Points and Avg are what the app shows.{' '}
                {baseline === 'defaults'
                    ? '“vs defaults” is the move against DefaultElo in elo.go.'
                    : '“vs saved games” is what the test and live games change, with the same weights.'}{' '}
                Click a player to follow them in the chart.
            </div>
        </div>
    );
}

function RankChange({ delta }: { delta: number }) {
    if (delta === 0) return <span className="chg same">=</span>;
    return delta > 0 ? (
        <span className="chg up">▲{delta}</span>
    ) : (
        <span className="chg down">▼{-delta}</span>
    );
}

function SplitBar({ result, hitting, scale }: { result: number; hitting: number; scale: number }) {
    const w = (v: number) => `${Math.min(100, (Math.abs(v) / scale) * 100)}%`;
    const bars = [
        { v: result, cls: 'r' },
        { v: hitting, cls: 's' },
    ];
    const neg = bars.filter((b) => b.v < 0).reverse();
    const pos = bars.filter((b) => b.v >= 0);
    return (
        <div className="split">
            <div className="half neg" style={{ gap: 2 }}>
                {neg.map((b) => (
                    <div key={b.cls} className={`bar ${b.cls}`} style={{ width: w(b.v) }} />
                ))}
            </div>
            <div className="half zero" style={{ display: 'flex', gap: 2 }}>
                {pos.map((b) => (
                    <div key={b.cls} className={`bar ${b.cls}`} style={{ width: w(b.v) }} />
                ))}
            </div>
        </div>
    );
}
