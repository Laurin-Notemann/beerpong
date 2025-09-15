export const formatPlacement = (placement: number) => '#' + placement;

export const formatElo = (value?: number) =>
    Number.isNaN(value) ? '--' : (value?.toFixed(0) ?? '--');

export const formatAverage = (value?: number) =>
    Number.isNaN(value) ? '--' : (value?.toFixed(1) ?? '--');

export const formatRatingChange = (value: number) =>
    Math.abs(value)
        .toFixed(0)
        .replace(/\.00$/, '.0')
        .replace(/([1-9])0+$/, '$1');

export const formatWinRate = (matchesPlayed?: number, matchesWon?: number) => {
    if (matchesPlayed == null || matchesWon == null) return '--';

    const winRatePercentage = Math.round((matchesWon / matchesPlayed) * 100);

    if (Number.isNaN(winRatePercentage)) return '--';

    return winRatePercentage + '%';
};
