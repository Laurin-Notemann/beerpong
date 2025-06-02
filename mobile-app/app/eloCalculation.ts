import { type Match } from '@/api/utils/matchDtoToMatch';

type ArrayElement<ArrayType extends readonly unknown[]> =
    ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

interface EloAlgorithmParameters {
    startingElo: number;
    kFactor: number;
    eloDivider: number;
}

class EloAlgorithm {
    public static params: EloAlgorithmParameters = {
        startingElo: 1500,
        kFactor: 32,
        eloDivider: 400,
    };

    private static expectedScore(elo1: number, elo2: number): number {
        return 1 / (1 + Math.pow(10, (elo2 - elo1) / this.params.eloDivider));
    }

    public static calculateElo(match: Match): Record<string, number> {
        const getRating = (p: ArrayElement<Match['redTeam']>) =>
            // @ts-expect-error
            p.elo ?? this.params.startingElo;

        const blueElos = match.blueTeam.map((p) => getRating(p));
        const redElos = match.redTeam.map((p) => getRating(p));
        const avgBlue =
            blueElos.reduce((sum, r) => sum + r, 0) / blueElos.length;
        const avgRed = redElos.reduce((sum, r) => sum + r, 0) / redElos.length;

        const expectedBlue = this.expectedScore(avgBlue, avgRed);
        const expectedRed = 1 - expectedBlue;

        const totalBluePoints = match.blueTeam.reduce(
            (sum, p) => sum + p.points,
            0
        );
        const totalRedPoints = match.redTeam.reduce(
            (sum, p) => sum + p.points,
            0
        );

        let actualBlue: number, actualRed: number;
        if (totalBluePoints === totalRedPoints) {
            actualBlue = actualRed = 0.5;
        } else if (totalBluePoints > totalRedPoints) {
            actualBlue = 1;
            actualRed = 0;
        } else {
            actualBlue = 0;
            actualRed = 1;
        }

        const deltaMap: Record<string, number> = {};

        for (const p of match.blueTeam) {
            const proportion =
                totalBluePoints === 0 ? 0 : p.points / totalBluePoints;
            const delta =
                this.params.kFactor * (actualBlue - expectedBlue) * proportion;
            deltaMap[p.id] = delta;
        }

        for (const p of match.redTeam) {
            const proportion =
                totalRedPoints === 0 ? 0 : p.points / totalRedPoints;
            const delta =
                this.params.kFactor * (actualRed - expectedRed) * proportion;
            deltaMap[p.id] = delta;
        }

        for (const p of match.blueTeam.concat(match.redTeam)) {
            const current = getRating(p);
            // @ts-expect-error
            p.elo = current + (deltaMap[p.id] ?? 0);
        }

        return deltaMap;
    }
}

export const eloAlgorithm = EloAlgorithm;
