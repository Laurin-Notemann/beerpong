/**
 * A team's first names in one short line: "Anna", "Anna & Ben", "Anna, Ben". How many more
 * there are is shown by the badge's "+N" avatar, not here.
 */
export function teamNames(names: string[]) {
    if (names.length <= 1) return names[0] ?? '';
    if (names.length === 2) return `${names[0]} & ${names[1]}`;
    return `${names[0]}, ${names[1]}`;
}

/** why a live match can't be finished yet, or nothing when it can */
export function finishHint(finishes: number) {
    if (finishes === 0) return 'Enter the finish to end the match';
    if (finishes > 1) return 'Only one finish can count. Remove the extra one';
    return undefined;
}

/** a cup hit as the match's list of moves shows it: who, on which team, with which move */
export interface MoveLogEntry {
    playerId: string;
    /** the scorer's team */
    team: 'red' | 'blue';
    /** e.g. "Bouncer", or "Normal · Finish - Ring of fire" with the finish it ended the match with */
    move: string;
    /** the cups each team had taken off the table right after it */
    blue: number;
    red: number;
}

/** a live match's cup hits, newest first, labelled with the rule's move names */
export function moveLog(
    cupHits: {
        team: 'red' | 'blue';
        playerId: string;
        moveId: string;
        finishMoveId?: string;
        cups: unknown[];
    }[],
    moves: { id?: string; name?: string | null }[]
): MoveLogEntry[] {
    const name = (id: string) => moves.find((i) => i.id === id)?.name || 'Hit';

    const score = { blue: 0, red: 0 };
    return cupHits
        .map((hit) => {
            // the hit team is the one whose cups went down; the scorer plays against it
            const team =
                hit.team === 'red' ? ('blue' as const) : ('red' as const);
            score[team] += hit.cups.length;
            return {
                playerId: hit.playerId,
                team,
                move: hit.finishMoveId
                    ? `${name(hit.moveId)} · ${name(hit.finishMoveId)}`
                    : name(hit.moveId),
                ...score,
            };
        })
        .reverse();
}
