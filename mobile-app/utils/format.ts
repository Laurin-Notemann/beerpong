export const formatPlacement = (placement: number) => '#' + placement;

export const formatRatingChange = (value: number) =>
    Math.abs(value)
        .toFixed(0)
        .replace(/\.00$/, '.0')
        .replace(/([1-9])0+$/, '$1');

/** `plural(1, 'match', 'matches')` → "1 match", `plural(3, …)` → "3 matches" */
export const plural = (count: number, one: string, many: string) =>
    `${count} ${count === 1 ? one : many}`;
