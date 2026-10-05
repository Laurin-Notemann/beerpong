import { useState } from 'react';

import type { RuleMove, Simulation, TestGame } from '~/simulator/api';

type Slot = { profileId: string; counts: Record<string, number> };
type Finish = { team: number; slot: number; moveId: string };

// TestEditor makes up a game from the group's players and the season's moves.
// The finish is picked once for the game, like in the app.
export function TestEditor({
    sim,
    initial,
    where,
    onSave,
    onCancel,
}: {
    sim: Simulation;
    initial?: TestGame;
    // where the game goes, for the title: "after game 7"
    where: string;
    onSave: (teams: TestGame['teams']) => void;
    onCancel: () => void;
}) {
    const hits = sim.moves.filter((m) => !m.finishing);
    const finishes = sim.moves.filter((m) => m.finishing);
    const [teams, setTeams] = useState<Slot[][]>(
        () => fromTest(initial, sim.moves) ?? [[empty()], [empty()]]
    );
    const [finish, setFinish] = useState<Finish | null>(() => finishOf(initial, sim.moves));

    const chosen = teams.flat().map((s) => s.profileId);
    const problem = !teams.every((t) => t.length > 0 && t.every((s) => s.profileId))
        ? 'Pick a player for every slot.'
        : new Set(chosen).size !== chosen.length
          ? 'A player can only play once.'
          : !finish || !teams[finish.team]?.[finish.slot]
            ? 'Pick who finished, and how.'
            : null;

    const update = (team: number, fn: (slots: Slot[]) => Slot[]) =>
        setTeams((ts) => ts.map((t, i) => (i === team ? fn(t) : t)));
    const nameOf = (id: string) => sim.profiles.find((p) => p.id === id)?.name ?? '?';

    return (
        <div className="card editor">
            <h3>Test game {where}</h3>
            <p className="hint" style={{ margin: 0 }}>
                Counted only on this page, with everything after it; nothing is saved.
            </p>
            <div className="teams2">
                {teams.map((slots, ti) => (
                    <div className="tcol" key={ti}>
                        <h4>Team {ti + 1}</h4>
                        {slots.map((slot, si) => (
                            <div className="prow2" key={si}>
                                <select
                                    aria-label="Player"
                                    value={slot.profileId}
                                    onChange={(e) =>
                                        update(ti, (t) =>
                                            t.map((s, i) =>
                                                i === si ? { ...s, profileId: e.target.value } : s
                                            )
                                        )
                                    }
                                >
                                    <option value="">Player…</option>
                                    {sim.profiles.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                                {hits.map((m) => (
                                    <label className="cnt" key={m.id}>
                                        {m.name}
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={slot.counts[m.id] ?? 0}
                                            onChange={(e) => {
                                                const n = Math.max(
                                                    0,
                                                    Math.min(100, Number(e.target.value) || 0)
                                                );
                                                update(ti, (t) =>
                                                    t.map((s, i) =>
                                                        i === si
                                                            ? {
                                                                  ...s,
                                                                  counts: {
                                                                      ...s.counts,
                                                                      [m.id]: n,
                                                                  },
                                                              }
                                                            : s
                                                    )
                                                );
                                            }}
                                        />
                                    </label>
                                ))}
                                {slots.length > 1 && (
                                    <button
                                        type="button"
                                        className="icon"
                                        aria-label="Remove player"
                                        onClick={() => {
                                            update(ti, (t) => t.filter((_, i) => i !== si));
                                            if (finish?.team === ti) setFinish(null);
                                        }}
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            className="icon"
                            onClick={() => update(ti, (t) => [...t, empty()])}
                        >
                            + Player
                        </button>
                    </div>
                ))}
            </div>
            <div className="finish">
                Finished by
                <select
                    aria-label="Finisher"
                    value={finish ? `${finish.team}/${finish.slot}` : ''}
                    onChange={(e) => {
                        const [team, slot] = e.target.value.split('/').map(Number);
                        setFinish(
                            e.target.value
                                ? { team, slot, moveId: finish?.moveId ?? finishes[0]?.id ?? '' }
                                : null
                        );
                    }}
                >
                    <option value="">Player…</option>
                    {teams.map((slots, ti) =>
                        slots.map((s, si) =>
                            s.profileId ? (
                                <option key={`${ti}/${si}`} value={`${ti}/${si}`}>
                                    {nameOf(s.profileId)} (team {ti + 1})
                                </option>
                            ) : null
                        )
                    )}
                </select>
                with
                <select
                    aria-label="Finish"
                    value={finish?.moveId ?? ''}
                    disabled={!finish}
                    onChange={(e) => finish && setFinish({ ...finish, moveId: e.target.value })}
                >
                    {finishes.map((m) => (
                        <option key={m.id} value={m.id}>
                            {m.name.replace(/^Finish - /, '')}
                        </option>
                    ))}
                </select>
            </div>
            <div className="actions">
                <button
                    type="button"
                    className="btn"
                    disabled={problem != null}
                    onClick={() => onSave(toTeams(teams, finish!))}
                >
                    Count this game
                </button>
                <button type="button" className="btn" onClick={onCancel}>
                    Cancel
                </button>
                {problem && <span className="problem">{problem}</span>}
            </div>
        </div>
    );
}

const empty = (): Slot => ({ profileId: '', counts: {} });

function toTeams(teams: Slot[][], finish: Finish): TestGame['teams'] {
    return teams.map((slots, ti) =>
        slots.map((s, si) => {
            const moves = Object.entries(s.counts)
                .filter(([, n]) => n > 0)
                .map(([moveId, count]) => ({ moveId, count }));
            if (finish.team === ti && finish.slot === si)
                moves.push({ moveId: finish.moveId, count: 1 });
            return { profileId: s.profileId, moves };
        })
    );
}

function fromTest(test: TestGame | undefined, moves: RuleMove[]): Slot[][] | undefined {
    if (!test) return undefined;
    const finishing = new Set(moves.filter((m) => m.finishing).map((m) => m.id));
    return test.teams.map((team) =>
        team.map((p) => ({
            profileId: p.profileId,
            counts: Object.fromEntries(
                p.moves.filter((m) => !finishing.has(m.moveId)).map((m) => [m.moveId, m.count])
            ),
        }))
    );
}

function finishOf(test: TestGame | undefined, moves: RuleMove[]): Finish | null {
    const finishing = new Set(moves.filter((m) => m.finishing).map((m) => m.id));
    for (const [ti, team] of (test?.teams ?? []).entries()) {
        for (const [si, p] of team.entries()) {
            const f = p.moves.find((m) => finishing.has(m.moveId) && m.count > 0);
            if (f) return { team: ti, slot: si, moveId: f.moveId };
        }
    }
    return null;
}
