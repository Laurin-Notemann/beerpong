import type { Standing } from '@/api';
import { sgn } from '@/format';

export function Board({
    standings,
    isDefault,
    follow,
    onToggle,
}: {
    standings: Standing[];
    isDefault: boolean;
    follow: Set<string>;
    onToggle: (name: string) => void;
}) {
    const scale = Math.max(...standings.map((s) => Math.max(Math.abs(s.result), Math.abs(s.hitting))), 1);
    return (
        <div className="card tbl-wrap">
            <table>
                <thead>
                    <tr>
                        <th className="num">#</th>
                        <th>Player</th>
                        <th className="num">Elo</th>
                        <th className="num">vs defaults</th>
                        <th className="num">Games</th>
                        <th className="num">Won</th>
                        <th className="num">Points</th>
                        <th className="num">Avg</th>
                        <th>Where the Elo came from</th>
                    </tr>
                </thead>
                <tbody>
                    {standings.map((s, i) => (
                        <tr
                            key={s.profileId}
                            tabIndex={0}
                            className={follow.has(s.profileId) ? 'hl' : ''}
                            onClick={() => onToggle(s.profileId)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onToggle(s.profileId);
                                }
                            }}
                        >
                            <td className="num rank">{i + 1}</td>
                            <td>
                                <b>{s.name}</b>
                            </td>
                            <td className="num elo">{s.elo.toFixed(0)}</td>
                            <td className="num">
                                {isDefault ? (
                                    <span className="chg same">–</span>
                                ) : (
                                    <>
                                        <RankChange delta={s.defaultRank - (i + 1)} />{' '}
                                        <span className="chg same">{sgn(s.elo - s.defaultElo, 0)}</span>
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
                                    <span style={{ color: 'var(--result)' }}>{sgn(s.result)}</span> ·{' '}
                                    <span style={{ color: 'var(--scoring)' }}>{sgn(s.hitting)}</span>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="hint">
                Points and Avg are what the app shows. “vs defaults” is the move against the constants in elo.go.
                Click a player to follow them in the chart.
            </div>
        </div>
    );
}

function RankChange({ delta }: { delta: number }) {
    if (delta === 0) return <span className="chg same">=</span>;
    return delta > 0 ? <span className="chg up">▲{delta}</span> : <span className="chg down">▼{-delta}</span>;
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
