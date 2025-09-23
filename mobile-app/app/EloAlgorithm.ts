import { MinimalMatch } from '@/api/utils/matchDtoToMatch';

// Lightweight adapter to mirror Java's PlayerStatisticsDto API
interface PlayerStatisticsLike {
    getPlayerId(): string;
    getElo(): number;
    setElo(v: number): void;
}

type InputMatch = MinimalMatch & {
    winnerTeamId: string;
    blueTeamId: string;
    redTeamId: string;
};

class EloAlgorithm {
    // Standard-Elo
    public static readonly STARTING_ELO = 1500;
    // Elo-Teiler
    // source: https://www.omnicalculator.com/sports/elo#what-is-the-elo-rating-system
    public static readonly ELO_DIVIDER = 400;

    /**
     * Wieviel zählt das Match-Ergebnis (Überraschungssiege)
     * Kleine Werte (bspw. 16) -> Ergebnis ist wenig relevant, Elo bewegt sich langsamer
     * Große Werte (bspw. 50) -> Große Relevanz, Überraschungen führen zu hohen Sprüngen
     */
    public static readonly K_TEAM = 25.0;
    /**
     * Wertung der individuellen Performance von Spielern (exp vs act)
     * Kleine Werte (bspw. 4) -> Performance ist nicht so wichtig, Ergebnis macht den größten Teil aus
     * Große Werte (bspw. 40) -> Performance ist sehr wichtig, eine Niederlage trotz guter Performance ist wenig problematisch
     */
    public static readonly K_PERF = 40.0;

    /**
     * Wie stark hängt die Erwartung der Punkteverteilung (exp vs act) vom Elo ab
     * Kleine Werte (bspw. 0.2) -> Erwartung ist fast gleichmäßig verteilt, Elo-Stärken im Team spielen kaum Rolle.
     * Große Werte (bspw. 0.8) -> Erwartung richtet sich stark nach Elo, die besten Spieler müssen immer sehr gut spielen
     */
    public static readonly ALPHA = 0.5;
    /**
     * Softmax-Schärfe. Wie stark schwankt das Elo zwischen unterschiedlich guten Spielern
     * Kleine Werte (bspw. 0.005) -> auch von schwächeren Spielern wird fast gleich viel erwartet
     * Große Werte (bspw. 0.05) -> schon kleine Elo-Unterschiede führen zu großen Erwartungs-Änderungen
     */
    public static readonly BETA = 0.02;

    /**
     * Pseudo-Punkte für die Glättung der act. Performances.
     * Erst wenn mehr Punkte erzielt werden, werden die richtigen Punkte relevant
     * Kleine Werte (bspw. 2) -> schon bei wenig Punkten werden die Ausschläge extrem
     * Große Werte (bspw. 8) -> viel Glättung. Selbst wenn mehr Punkte fallen bleiben die Shares ähnlich
     */
    public static readonly PSEUDO_POINTS_SMOOTHING = 3.0;
    /**
     * Wie schnell die wirkliche Performance relevanter wird
     * Zu Beginn (mit wenig Punkten) sind die Shares der Performance aller Spieler immernoch ähnlich
     * Kleine Werte (bspw. 3) -> schon nach 3 Punkten wird die Performance wichtig
     * Große Werte (bspw. 15) -> erst nach 15 Punkten wird die Performance wirklich relvant
     */
    public static readonly PERF_POINTS_SCALE_C = 3.0;
    /**
     * Mindestgewichtung der Performance. Damit die Performance nie komplett egal ist
     * Kleine Werte (bspw. 0.1) -> bei Spielen mit wenig Punkten hat die Performance wenig Einfluss (10%)
     * Große Werte (bspw. 0.3) -> selbst mit keinen Punkten zählt die Performance zu 30%
     */
    public static readonly PERF_WEIGHT_FLOOR = 0.35;

    // Max Elo-Gain pro Spiel, um komplette Outbreaks zu vermeiden
    public static readonly CAP_PER_PLAYER = 40.0;
    // Mindest-Anforderung an Spieler (5% der Punkte)
    public static readonly SOFTMAX_CLAMP_FLOOR = 0.05;
    // Maximal-Anforderung an Spieler (90% der Punkte)
    public static readonly SOFTMAX_CLAMP_CEIL = 0.9;

    public static calculateElo(
        winningTeamId: string,
        blueTeamId: string,
        teamBluePoints: number,
        teamRedPoints: number,
        blueTeamStats: PlayerStatisticsLike[],
        redTeamStats: PlayerStatisticsLike[],
        playerPoints: Map<string, number>
    ): void;
    public static calculateElo(match: InputMatch): void;
    public static calculateElo(
        a: string | InputMatch,
        b?: string,
        c?: number,
        d?: number,
        e?: PlayerStatisticsLike[],
        f?: PlayerStatisticsLike[],
        g?: Map<string, number>
    ): void {
        // Wrapper to keep existing callers working
        if (typeof a !== 'string') {
            const match = a as InputMatch;

            const blue = match.blueTeam;
            const red = match.redTeam;

            // Backend builds team points from per-scorer points only (pointsForScorer),
            // team bonus points are distributed to entries but should not inflate team totals for Elo
            const teamBluePoints = blue.reduce(
                (s, p) => s + (p.points ?? 0),
                0
            );
            const teamRedPoints = red.reduce((s, p) => s + (p.points ?? 0), 0);

            const wrap = (
                players: InputMatch['redTeam']
            ): PlayerStatisticsLike[] => {
                return players.map((p) => ({
                    getPlayerId: () => p.id as string,
                    getElo: () => {
                        // @ts-expect-error dynamic field
                        const val = p.elo;
                        return typeof val === 'number'
                            ? val
                            : EloAlgorithm.STARTING_ELO;
                    },
                    setElo: (v: number) => {
                        // @ts-expect-error dynamic field
                        p.elo = v;
                    },
                }));
            };

            const playerPoints = new Map<string, number>();
            for (const p of blue)
                playerPoints.set(p.id as string, p.points ?? 0);
            for (const p of red)
                playerPoints.set(p.id as string, p.points ?? 0);

            // Delegate to Java-style API using real blue team id
            return EloAlgorithm.calculateElo(
                match.winnerTeamId ?? '',
                match.blueTeamId,
                teamBluePoints,
                teamRedPoints,
                wrap(blue),
                wrap(red),
                playerPoints
            );
        }

        const winningTeamId = a as string;
        const blueTeamId = b as string;
        const teamBluePoints = c as number;
        const teamRedPoints = d as number;
        const blueTeamStats = e as PlayerStatisticsLike[];
        const redTeamStats = f as PlayerStatisticsLike[];
        const playerPoints = g as Map<string, number>;

        // Game-Result berechnen
        const resultBlue = winningTeamId === blueTeamId ? 1.0 : 0.0;
        const resultRed = 1.0 - resultBlue;

        // Elo-Durchschnitte
        const eloAvgBlue = EloAlgorithm.averageElo(blueTeamStats);
        const eloAvgRed = EloAlgorithm.averageElo(redTeamStats);

        // Expected Shares an den Teampunkten berechnen
        const expShare = new Map<string, number>();
        EloAlgorithm.expectedShare(blueTeamStats, expShare);
        EloAlgorithm.expectedShare(redTeamStats, expShare);

        // Tatsächliche Anteile an den Teampunkten
        const actShare = new Map<string, number>();
        EloAlgorithm.actualShare(
            blueTeamStats,
            playerPoints,
            teamBluePoints,
            actShare
        );
        EloAlgorithm.actualShare(
            redTeamStats,
            playerPoints,
            teamRedPoints,
            actShare
        );

        // Deltas anwenden und Elo berechnen
        EloAlgorithm.applyDeltas(
            blueTeamStats,
            resultBlue,
            eloAvgRed,
            expShare,
            actShare,
            teamBluePoints,
            teamRedPoints
        );
        EloAlgorithm.applyDeltas(
            redTeamStats,
            resultRed,
            eloAvgBlue,
            expShare,
            actShare,
            teamRedPoints,
            teamBluePoints
        );
    }

    private static applyDeltas(
        players: PlayerStatisticsLike[],
        result: number,
        eloAvgOpp: number,
        expShare: Map<string, number>,
        actShare: Map<string, number>,
        teamPoints: number,
        oppPoints: number
    ) {
        const m = Math.max(0, teamPoints + oppPoints);

        const wPoints = m / (m + EloAlgorithm.PERF_POINTS_SCALE_C);
        const wRatio =
            teamPoints + oppPoints > 0
                ? teamPoints / (teamPoints + oppPoints)
                : 0.5;

        const wPerf = Math.max(
            EloAlgorithm.PERF_WEIGHT_FLOOR,
            Math.sqrt(wPoints) * Math.sqrt(wRatio)
        );

        for (const p of players) {
            const expVsOpp = EloAlgorithm.expectedScore(p.getElo(), eloAvgOpp);
            const deltaTeam = EloAlgorithm.K_TEAM * (result - expVsOpp);

            const dShare =
                (actShare.get(p.getPlayerId()) ?? 0) -
                (expShare.get(p.getPlayerId()) ?? 0);

            const deltaPerformance = EloAlgorithm.K_PERF * wPerf * dShare;
            const eloChange = Math.max(
                -EloAlgorithm.CAP_PER_PLAYER,
                Math.min(
                    EloAlgorithm.CAP_PER_PLAYER,
                    deltaTeam + deltaPerformance
                )
            );
            p.setElo(p.getElo() + eloChange);
        }
    }

    private static averageElo(players: PlayerStatisticsLike[]): number {
        const vals = players.map((p) => p.getElo());
        if (vals.length === 0) return EloAlgorithm.STARTING_ELO;
        const sum = vals.reduce((a, b) => a + b, 0);
        return sum / vals.length;
    }

    public static expectedScore(elo1: number, elo2: number): number {
        // source: https://www.omnicalculator.com/sports/elo#what-is-the-elo-rating-system
        return (
            1.0 /
            (1.0 + Math.pow(10.0, (elo2 - elo1) / EloAlgorithm.ELO_DIVIDER))
        );
    }

    public static expectedShare(
        players: PlayerStatisticsLike[],
        out: Map<string, number>
    ) {
        if (players.length === 0) return;

        // Amount of players
        const n = players.length;

        // Softmax(Elo)
        const logits: number[] = new Array(n);
        let sumExp = 0.0;

        for (let i = 0; i < n; i++) {
            const elo = players[i].getElo();
            const e = Math.exp(EloAlgorithm.BETA * elo);

            logits[i] = e;
            sumExp += e;
        }

        // Blend + Clamp, damit von niemandem 0%/100% erwartet wird
        const shares: number[] = new Array(n);
        let sum = 0.0;

        for (let i = 0; i < n; i++) {
            const soft = logits[i] / (sumExp > 0 ? sumExp : 1.0);
            const blended =
                (1.0 - EloAlgorithm.ALPHA) * (1.0 / n) +
                EloAlgorithm.ALPHA * soft;
            //TODO maybe make clamp floor/ceil dynamic based on team size
            //            double floor = Math.max(0.02, 0.25 / n);   // ca. 12.5% bei 2er-Team, 8.3% bei 3er, 5% bei 5er, 2.5% bei 10er
            //            double ceil  = Math.min(0.90, 1.0 - (n - 1) * floor);  // garantiert machbar

            const clamped = Math.max(
                EloAlgorithm.SOFTMAX_CLAMP_FLOOR,
                Math.min(EloAlgorithm.SOFTMAX_CLAMP_CEIL, blended)
            );

            shares[i] = clamped;
            sum += clamped;
        }

        // renorm auf 1
        for (let i = 0; i < n; i++) {
            if (sum === 0) {
                out.set(players[i].getPlayerId(), 0);
            } else {
                out.set(players[i].getPlayerId(), shares[i] / sum);
            }
        }
    }

    public static actualShare(
        players: PlayerStatisticsLike[],
        playerPoints: Map<string, number>,
        teamPoints: number,
        out: Map<string, number>
    ) {
        const n = players.length;

        const denom = teamPoints + EloAlgorithm.PSEUDO_POINTS_SMOOTHING;
        const perPlayerPrior =
            n > 0 ? EloAlgorithm.PSEUDO_POINTS_SMOOTHING / n : 0.0;

        if (denom <= 0) {
            const uniform = 1.0 / Math.max(1, n);
            for (const p of players) out.set(p.getPlayerId(), uniform);
            return;
        }

        for (const p of players) {
            const pts = playerPoints.get(p.getPlayerId()) ?? 0;
            const share = (pts + perPlayerPrior) / denom;
            out.set(p.getPlayerId(), share);
        }
    }

    // Back-compat params object for existing callers
    public static params = {
        startingElo: EloAlgorithm.STARTING_ELO,
        eloDivider: EloAlgorithm.ELO_DIVIDER,
        kTeam: EloAlgorithm.K_TEAM,
        kPerf: EloAlgorithm.K_PERF,
        alpha: EloAlgorithm.ALPHA,
        beta: EloAlgorithm.BETA,
        pseudoPointsSmoothing: EloAlgorithm.PSEUDO_POINTS_SMOOTHING,
        perfPointsScaleC: EloAlgorithm.PERF_POINTS_SCALE_C,
        perfWeightFloor: EloAlgorithm.PERF_WEIGHT_FLOOR,
        capPerPlayer: EloAlgorithm.CAP_PER_PLAYER,
        softmaxClampFloor: EloAlgorithm.SOFTMAX_CLAMP_FLOOR,
        softmaxClampCeil: EloAlgorithm.SOFTMAX_CLAMP_CEIL,
    } as const;
}

export const eloAlgorithm = EloAlgorithm;
