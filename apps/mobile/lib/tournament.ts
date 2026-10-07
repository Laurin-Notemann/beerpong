import type { Components } from '@/openapi/openapi';

export const TOURNAMENT_COLOR = '#A855F7';
export const TOURNAMENT_ICON = 'tournament' as const;
export type Tournament = Components.Schemas.TournamentDto;
export type TournamentStage = Components.Schemas.TournamentStageDto;
export type TournamentFixture = Components.Schemas.TournamentFixtureDto;
export type StagePlan = Components.Schemas.TournamentStageCreateDto;
export type TournamentTeam = Components.Schemas.TournamentTeamDto;
export type Strategy = StagePlan['strategy'];

export function stageName(count: number, strategy: Strategy): string {
    if (strategy === 'ROUND_ROBIN') return 'Qualifizierungsrunde';
    if (count === 2) return 'Finale';
    if (count <= 4) return 'Halbfinale';
    if (count <= 8) return 'Viertelfinale';
    if (count <= 16) return 'Achtelfinale';
    return 'Sechzehntelfinale';
}
export const strategyName = (strategy: Strategy) =>
    strategy === 'ROUND_ROBIN' ? 'Round robin' : 'Knockout';

export function strategiesFor(count: number) {
    return [
        {
            strategy: 'KNOCKOUT' as const,
            name: 'Knockout',
            description: `${Math.floor(count / 2)} games${count % 2 ? ' · 1 bye' : ''}. Winners advance.`,
        },
        {
            strategy: 'ROUND_ROBIN' as const,
            name: 'Round robin',
            description: `${(count * (count - 1)) / 2} games. Every team plays every other team.`,
        },
    ];
}
export function knockoutPlan(count: number): StagePlan[] {
    const stages: StagePlan[] = [];
    while (count > 1) {
        stages.push({
            name: stageName(count, 'KNOCKOUT'),
            strategy: 'KNOCKOUT',
            advanceCount: Math.ceil(count / 2),
        });
        count = Math.ceil(count / 2);
    }
    return stages;
}
/** Keep earlier stages and rebuild the remaining knockout rounds after a format changes. */
export function changeStage(
    stages: StagePlan[],
    index: number,
    count: number,
    strategy: Strategy,
    advanceCount?: number
): StagePlan[] {
    const advance =
        strategy === 'KNOCKOUT'
            ? Math.ceil(count / 2)
            : Math.max(
                  1,
                  Math.min(count - 1, advanceCount ?? (count > 4 ? 4 : 2))
              );
    return [
        ...stages.slice(0, index),
        {
            name:
                stages[index]?.name &&
                stages[index].name !== stageName(count, stages[index].strategy)
                    ? stages[index].name
                    : stageName(count, strategy),
            strategy,
            advanceCount: advance,
        },
        ...knockoutPlan(advance),
    ];
}
export function standings(stage: TournamentStage) {
    const rows = stage.teamIds.map((teamId, seed) => ({
        teamId,
        seed,
        played: 0,
        wins: 0,
        scored: 0,
        conceded: 0,
    }));
    for (const f of stage.matches) {
        if (f.status !== 'FINISHED') continue;
        for (const r of rows) {
            if (r.teamId === f.blueTeamId) {
                r.played++;
                r.scored += f.blueScore;
                r.conceded += f.redScore;
            }
            if (r.teamId === f.redTeamId) {
                r.played++;
                r.scored += f.redScore;
                r.conceded += f.blueScore;
            }
            if (r.teamId === f.winnerTeamId) r.wins++;
        }
    }
    return rows.sort(
        (a, b) =>
            b.wins - a.wins ||
            b.scored - b.conceded - (a.scored - a.conceded) ||
            b.scored - a.scored ||
            a.seed - b.seed
    );
}
/** Local editor preview. The API independently validates and reserves the actual game ids. */
export function previewStages(
    teams: TournamentTeam[],
    plan: StagePlan[]
): TournamentStage[] {
    let count = teams.length;
    return plan.map((p, index) => {
        const matches: TournamentFixture[] = [];
        const fixture = (blue: string | null, red: string | null) => ({
            id: `preview-${index}-${matches.length}`,
            blueTeamId: blue,
            redTeamId: red,
            status:
                index > 0
                    ? ('BLOCKED' as const)
                    : red
                      ? ('READY' as const)
                      : ('BYE' as const),
            resultMatchId: null,
            winnerTeamId: red ? null : blue,
            blueScore: 0,
            redScore: 0,
        });
        if (p.strategy === 'ROUND_ROBIN') {
            for (let a = 0; a < count; a++)
                for (let b = a + 1; b < count; b++)
                    matches.push(
                        fixture(
                            index === 0 ? teams[a].id : null,
                            index === 0 ? teams[b].id : null
                        )
                    );
        } else {
            const n = Math.ceil(count / 2);
            for (let a = 0; a < n; a++) {
                const b = n * 2 - 1 - a;
                matches.push(
                    fixture(
                        index === 0 ? teams[a].id : null,
                        index === 0 && b < count ? teams[b].id : null
                    )
                );
            }
        }
        const stage = {
            ...p,
            teamIds: index === 0 ? teams.map((t) => t.id) : [],
            matches,
        };
        count = p.advanceCount;
        return stage;
    });
}
