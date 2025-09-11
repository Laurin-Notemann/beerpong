import { type Match } from '@/api/utils/matchDtoToMatch';

type ArrayElement<ArrayType extends readonly unknown[]> =
    ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

interface EloAlgorithmParameters {
    startingElo: number;
    eloDivider: number;

    // Team result vs. expectation (surprise wins)
    kTeam: number;
    // Individual performance weighting (exp vs. act)
    kPerf: number;

    // Blend between uniform and softmax(Elo)
    alpha: number;
    // Softmax sharpness for Elo → expected share
    beta: number;

    // Smoothing/prior for actual shares
    pseudoPointsSmoothing: number;
    // Points scale for how quickly performance becomes relevant
    perfPointsScaleC: number;
    // Minimum weight on performance
    perfWeightFloor: number;

    // Safety caps & clamps
    capPerPlayer: number;
    softmaxClampFloor: number;
    softmaxClampCeil: number;
}

class EloAlgorithm {
    public static params: EloAlgorithmParameters = {
        startingElo: 1500,
        eloDivider: 400,

        kTeam: 25.0,
        kPerf: 40.0,

        alpha: 0.5,
        beta: 0.02,

        pseudoPointsSmoothing: 3.0,
        perfPointsScaleC: 3.0,
        perfWeightFloor: 0.35,

        capPerPlayer: 40.0,
        softmaxClampFloor: 0.05,
        softmaxClampCeil: 0.9,
    };

    // --- helpers --------------------------------------------------------------

    private static getRating(p: ArrayElement<Match['redTeam']>): number {
        // @ts-expect-error TODO: type elo field
        return typeof p.elo === 'number' ? p.elo : this.params.startingElo;
    }

    private static expectedScore(elo1: number, elo2: number): number {
        return 1 / (1 + Math.pow(10, (elo2 - elo1) / this.params.eloDivider));
    }

    private static averageElo(
        players: ArrayElement<Match['redTeam']>[]
    ): number {
        if (players.length === 0) return this.params.startingElo;
        const sum = players.reduce((s, p) => s + this.getRating(p), 0);
        return sum / players.length;
    }

    private static expectedShare(
        players: ArrayElement<Match['redTeam']>[],
        out: Map<string, number>
    ): void {
        if (players.length === 0) return;

        const n = players.length;
        const { alpha, beta, softmaxClampFloor, softmaxClampCeil } =
            this.params;

        // softmax over Elo
        const logits = players.map((p) => Math.exp(beta * this.getRating(p)));
        const sumExp = logits.reduce((a, b) => a + b, 0) || 1;

        // blend with uniform, then clamp, then renormalize
        const blended = logits.map(
            (e) => (1 - alpha) * (1 / n) + alpha * (e / sumExp)
        );
        const clamped = blended.map((v) =>
            Math.max(softmaxClampFloor, Math.min(softmaxClampCeil, v))
        );
        const sumClamped = clamped.reduce((a, b) => a + b, 0) || 1;

        for (let i = 0; i < n; i++) {
            const pid = players[i].id as string;
            out.set(pid, clamped[i] / sumClamped);
        }
    }

    private static actualShare(
        players: ArrayElement<Match['redTeam']>[],
        teamPoints: number,
        out: Map<string, number>
    ): void {
        const n = players.length;
        const { pseudoPointsSmoothing } = this.params;

        const denom = teamPoints + pseudoPointsSmoothing;
        const perPlayerPrior = n > 0 ? pseudoPointsSmoothing / n : 0;

        if (denom <= 0) {
            const uniform = 1 / Math.max(1, n);
            for (const p of players) out.set(p.id as string, uniform);
            return;
        }

        for (const p of players) {
            const pts = p.points ?? 0;
            const share = (pts + perPlayerPrior) / denom;
            out.set(p.id as string, share);
        }
    }

    private static applyDeltas(
        players: ArrayElement<Match['redTeam']>[],
        result: number,
        eloAvgOpp: number,
        expShare: Map<string, number>,
        actShare: Map<string, number>,
        teamPoints: number,
        oppPoints: number,
        deltaMap: Record<string, number>
    ) {
        const {
            kTeam,
            kPerf,
            perfPointsScaleC,
            perfWeightFloor,
            capPerPlayer,
        } = this.params;

        const m = Math.max(0, teamPoints + oppPoints);
        const wPoints = m / (m + perfPointsScaleC);
        const wRatio = m > 0 ? teamPoints / m : 0.5;
        const wPerf = Math.max(
            perfWeightFloor,
            Math.sqrt(wPoints) * Math.sqrt(wRatio)
        );

        for (const p of players) {
            const pid = p.id as string;

            const expVsOpp = this.expectedScore(this.getRating(p), eloAvgOpp);
            const deltaTeam = kTeam * (result - expVsOpp);

            const dShare = (actShare.get(pid) ?? 0) - (expShare.get(pid) ?? 0);

            const deltaPerformance = kPerf * wPerf * dShare;

            const eloChangeUncapped = deltaTeam + deltaPerformance;
            const eloChange = Math.max(
                -capPerPlayer,
                Math.min(capPerPlayer, eloChangeUncapped)
            );

            const oldElo = this.getRating(p);
            const newElo = oldElo + eloChange;

            // @ts-expect-error TODO: type elo field
            p.elo = newElo;

            // return the actual per-player change
            deltaMap[pid] = eloChange;
        }
    }

    // --- public API (same interface) -----------------------------------------

    /** Calculates and applies Elo deltas; returns per-player Elo changes. */
    public static calculateElo(match: Match): Record<string, number> {
        const blue = match.blueTeam;
        const red = match.redTeam;

        const teamBluePoints = blue.reduce((s, p) => s + (p.points ?? 0), 0);
        const teamRedPoints = red.reduce((s, p) => s + (p.points ?? 0), 0);

        // match result (team)
        const resultBlue =
            teamBluePoints === teamRedPoints
                ? 0.5
                : teamBluePoints > teamRedPoints
                  ? 1
                  : 0;
        const resultRed = 1 - resultBlue;

        // average opponent Elos
        const eloAvgBlue = this.averageElo(blue);
        const eloAvgRed = this.averageElo(red);

        // expected and actual shares
        const expShare = new Map<string, number>();
        this.expectedShare(blue, expShare);
        this.expectedShare(red, expShare);

        const actShare = new Map<string, number>();
        this.actualShare(blue, teamBluePoints, actShare);
        this.actualShare(red, teamRedPoints, actShare);

        // apply deltas
        const deltaMap: Record<string, number> = {};
        this.applyDeltas(
            blue,
            resultBlue,
            eloAvgRed,
            expShare,
            actShare,
            teamBluePoints,
            teamRedPoints,
            deltaMap
        );
        this.applyDeltas(
            red,
            resultRed,
            eloAvgBlue,
            expShare,
            actShare,
            teamRedPoints,
            teamBluePoints,
            deltaMap
        );

        return deltaMap;
    }
}

export const eloAlgorithm = EloAlgorithm;
