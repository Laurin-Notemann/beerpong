export const formatPlacement = (placement: number) => '#' + placement;

export const formatRatingChange = (value: number) =>
    Math.abs(value)
        .toFixed(0)
        .replace(/\.00$/, '.0')
        .replace(/([1-9])0+$/, '$1');
