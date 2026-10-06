import { type CupTeam, findHit } from '@/lib/cupHits';
import type { LiveMatchState } from '@/lib/liveMatch/types';
import { cupLayout } from '@/lib/rerack';

/**
 * A team's own cups as they're drawn (re-racked, or the pyramid), for the Live Activity: three
 * digits per cup, its x and y on the 7x7 grid and 1 while it's still standing. Like Versus TV's
 * racks (foldLiveMatch), in few enough bytes for an ActivityKit push.
 */
export function rackCode(state: LiveMatchState, team: CupTeam) {
    return cupLayout(state.cupHits, team, state.reracks[team])
        .map(
            (i) =>
                `${i.drawn.x}${i.drawn.y}${findHit(state.cupHits, team, i.cup) ? 0 : 1}`
        )
        .join('');
}
