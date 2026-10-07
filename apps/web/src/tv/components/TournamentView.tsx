import { standings, TOURNAMENT_COLOR, type Tournament } from '@/lib/tournament';
import { TournamentIcon } from '~/tv/components/TournamentIcon';
import type { LiveMatchView } from '~/tv/server/board';

/** The bracket and standings use the same server-reserved fixtures as the phones. */
export function TournamentView({
    tournament,
    live,
    table = false,
}: {
    tournament: Tournament | null;
    live: LiveMatchView[];
    table?: boolean;
}) {
    if (!tournament)
        return (
            <div className="grid flex-1 place-items-center text-[2rem] text-text-2">
                Start a tournament in the app’s settings.
            </div>
        );
    const name = (id: string | null) =>
        tournament.teams.find((t) => t.id === id)?.name ?? 'To be decided';
    const stage =
        tournament.stages.find((s) =>
            s.matches.some((f) => f.status === 'IN_PROGRESS' || f.status === 'READY')
        ) ?? tournament.stages.at(-1);
    const columns = tournament.stages.filter(
        (s) => s.teamIds.length > 0 || s.strategy === 'KNOCKOUT'
    );
    const rows = stage ? standings(stage) : [];
    return (
        <section className="flex min-h-0 flex-1 flex-col gap-[1.5rem]">
            <div className="flex items-center gap-[1rem]" style={{ color: TOURNAMENT_COLOR }}>
                <TournamentIcon />
                <h2 className="text-[2.7rem] font-black">{tournament.name}</h2>
                <span className="text-[1.4rem]">
                    {tournament.status === 'FINISHED'
                        ? `Winner: ${name(tournament.winnerTeamId)}`
                        : tournament.status === 'CANCELLED'
                          ? 'Cancelled'
                          : `${tournament.teams.length} teams · ${stage?.name ?? ''}`}
                </span>
            </div>
            {table ? (
                <div className="min-h-0 flex-1 overflow-auto rounded-[1.5rem] bg-panel p-[2rem]">
                    <table className="w-full text-[1.8rem]">
                        <thead>
                            <tr className="text-left text-text-3">
                                <th className="pb-5">Team</th>
                                <th>Played</th>
                                <th>Wins</th>
                                <th>Points</th>
                                <th>Difference</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, i) => (
                                <tr
                                    key={r.teamId}
                                    style={{
                                        color:
                                            i < (stage?.advanceCount ?? 1)
                                                ? TOURNAMENT_COLOR
                                                : undefined,
                                    }}
                                >
                                    <td className="py-3 font-bold">
                                        {i + 1}. {name(r.teamId)}
                                    </td>
                                    <td>{r.played}</td>
                                    <td>{r.wins}</td>
                                    <td>{r.scored}</td>
                                    <td>
                                        {r.scored - r.conceded > 0 ? '+' : ''}
                                        {r.scored - r.conceded}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <p className="mt-5 text-[1rem] text-text-3">
                        Wins, point difference, points scored, then original team order.
                    </p>
                </div>
            ) : (
                <div className="flex min-h-0 flex-1 gap-[2rem] overflow-auto">
                    {columns.map((s, index) => (
                        <div key={index} className="flex min-w-[18rem] flex-1 flex-col gap-[1rem]">
                            <h3
                                className="text-[1.6rem] font-bold"
                                style={{ color: TOURNAMENT_COLOR }}
                            >
                                {s.name}
                            </h3>
                            <div className="flex flex-1 flex-col justify-around gap-[1rem]">
                                {s.matches.map((f) => {
                                    const playing = live.find((l) => l.id === f.id);
                                    return (
                                        <div
                                            key={f.id}
                                            className="rounded-[1rem] border border-line bg-panel p-[1.2rem]"
                                            style={{
                                                borderColor:
                                                    f.status === 'IN_PROGRESS'
                                                        ? TOURNAMENT_COLOR
                                                        : undefined,
                                            }}
                                        >
                                            {(['blue', 'red'] as const).map((side) => (
                                                <div
                                                    key={side}
                                                    className="flex items-center justify-between gap-4 text-[1.4rem]"
                                                >
                                                    <span
                                                        className={
                                                            f.winnerTeamId === f[`${side}TeamId`]
                                                                ? 'font-black'
                                                                : 'text-text-2'
                                                        }
                                                    >
                                                        {f.status === 'BYE' && side === 'red'
                                                            ? 'Bye'
                                                            : name(f[`${side}TeamId`])}
                                                    </span>
                                                    <span
                                                        className={`tabular font-black ${side === 'blue' ? 'text-blue' : 'text-red'}`}
                                                    >
                                                        {playing
                                                            ? playing[side].score
                                                            : f.status === 'FINISHED'
                                                              ? f[`${side}Score`]
                                                              : '—'}
                                                    </span>
                                                </div>
                                            ))}
                                            <div
                                                className="mt-2 text-[0.9rem]"
                                                style={{ color: TOURNAMENT_COLOR }}
                                            >
                                                {f.status === 'IN_PROGRESS'
                                                    ? 'LIVE'
                                                    : f.status === 'FINISHED'
                                                      ? 'Finished'
                                                      : f.status === 'BYE'
                                                        ? 'Bye'
                                                        : f.status === 'READY'
                                                          ? 'Up next'
                                                          : 'Waiting for previous stage'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
