import type { RuleMoveDto } from '@/openapi/openapi';

// Mirrors RuleMoveCups.java. The server always sends `cups`; this covers cached data from
// before the field existed.
const defaultCupsByName: Record<string, number> = {
    Normal: 1,
    Bomb: 1,
    Bouncer: 2,
    Trickshot: 1,
    Save: 0,
    'Finish - Normal': 0,
    'Finish - Ring of fire': 6,
    'Finish - Ring of water': 4,
};

/** How many cups one hit of this move takes off the table. */
export const cupsPerHit = (
    move: Pick<RuleMoveDto, 'name' | 'finishingMove' | 'cups'>
): number =>
    move.cups ??
    defaultCupsByName[move.name ?? ''] ??
    (move.finishingMove ? 0 : 1);

/**
 * A team's score: the cups its moves took off the table. A won match ends at 10 — a bouncer
 * takes two, a bomb one (it's worth two points, not two cups), the finish none on top of the
 * last hit, a save (the last hit in overtime) none, the rings their whole formation.
 */
export const countCups = (moves: { count: number; cups: number }[]): number =>
    moves.reduce((sum, move) => sum + move.count * move.cups, 0);
