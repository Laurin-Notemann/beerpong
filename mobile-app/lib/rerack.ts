import {
    CUP_FORMATION,
    CupHit,
    CupPosition,
    CupTeam,
    standingCups,
} from '@/lib/cupHits';

/**
 * Pro mode: a team's cups put back together in another formation (e.g. 6 cups into a pyramid).
 * Each cup drawn in the new formation stands for one cup of the original pyramid, so hits keep
 * recording pyramid positions and the hit log, the server and other phones don't change.
 * A re-rack only shows on the phone that made it.
 */
export interface Rerack {
    /** the saved formation it was made from */
    formationId: string;
    slots: { drawn: CupPosition; cup: CupPosition }[];
}

const same = (a: CupPosition, b: CupPosition) => a.x === b.x && a.y === b.y;
const byRow = (a: CupPosition, b: CupPosition) => a.y - b.y || a.x - b.x;

/** pairs the formation's cups with the cups still standing, row by row */
export function rerack(
    hits: CupHit[],
    team: CupTeam,
    formation: { id: string; cups: CupPosition[] }
): Rerack | undefined {
    const standing = [...standingCups(hits, team)].sort(byRow);
    if (formation.cups.length !== standing.length) return;

    const drawn = [...formation.cups].sort(byRow);

    return {
        formationId: formation.id,
        slots: drawn.map((i, idx) => ({
            drawn: { x: i.x, y: i.y },
            cup: { x: standing[idx].x, y: standing[idx].y },
        })),
    };
}

/**
 * Where each cup of the team is drawn: as re-racked, or in the pyramid. A re-rack that misses a
 * standing cup (a hit from before it was put back) no longer applies, so the pyramid shows again.
 */
export function cupLayout(hits: CupHit[], team: CupTeam, rerack?: Rerack) {
    const applies =
        !!rerack &&
        standingCups(hits, team).every((cup) =>
            rerack.slots.some((i) => same(i.cup, cup))
        );

    return applies
        ? rerack.slots
        : CUP_FORMATION.cups.map((cup) => ({ drawn: cup, cup }));
}

/** the pyramid cup drawn at `drawn` */
export const cupAt = (
    layout: ReturnType<typeof cupLayout>,
    drawn: CupPosition
) => layout.find((i) => same(i.drawn, drawn))?.cup;
