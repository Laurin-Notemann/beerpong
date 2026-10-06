import type { Placement } from '@/constants/rankingAlgorithms';

/** "#2", or golf-style "T2" when the rank is shared */
export const formatPlacement = ({ rank, tied }: Placement) =>
    (tied ? 'T' : '#') + rank;

/** the size of a rating change in whole points, without its sign: −8.4 → "8" */
export const formatRatingChange = (value: number) => Math.abs(value).toFixed(0);

/** `plural(1, 'match', 'matches')` → "1 match", `plural(3, …)` → "3 matches" */
export const plural = (count: number, one: string, many: string) =>
    `${count} ${count === 1 ? one : many}`;
