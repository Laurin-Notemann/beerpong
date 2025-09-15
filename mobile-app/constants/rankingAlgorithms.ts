export const rankingAlgorithms = {
    AVERAGE: {},
    ELO: {},
    MATCHES_WON: {},
};

export type RankingAlgorithm = keyof typeof rankingAlgorithms;
