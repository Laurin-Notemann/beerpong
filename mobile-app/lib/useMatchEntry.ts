import { useEffect, useRef } from 'react';

import { useGroup } from '@/api/calls/seasonHooks';
import {
    useLiveMatch,
    useLiveMatchActions,
} from '@/api/liveMatch/useLiveMatch';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { useMatchDraftStore } from '@/zustand/matchDraftStore';

/**
 * The teams, cup hits and entry actions of the match being entered: the live match with this id,
 * or the local draft when there is none. Both sources are always subscribed (hooks can't be
 * conditional); the one that isn't used is idle, since an empty id never queries or finds an entry.
 * `seasonId` is the season whose players and rules the entry uses: a live match's own season,
 * which may no longer be the active one.
 */
export function useMatchEntry(liveMatchId?: string) {
    const { groupId, seasonId: activeSeasonId } = useGroup();

    const draft = useMatchDraftStore();
    const live = useLiveMatch(groupId ?? '', liveMatchId ?? '');
    const liveActions = useLiveMatchActions(groupId ?? '', liveMatchId ?? '');

    if (liveMatchId) {
        const header = live.liveMatch;

        return {
            seasonId: header?.seasonId || activeSeasonId,
            /** finished or discarded, e.g. on another phone; edits are ignored then */
            isEnded: !!header && header.status !== 'IN_PROGRESS',
            redTeam: live.state.redTeam,
            blueTeam: live.state.blueTeam,
            cupHits: live.state.cupHits,
            actions: {
                setPlayerTeam: liveActions.setPlayerTeam,
                setMoveCount: liveActions.setMoveCount,
                recordCupHit: liveActions.recordCupHit,
                undoCupHit: liveActions.undoCupHit,
            },
        };
    }

    return {
        seasonId: activeSeasonId,
        isEnded: false,
        redTeam: draft.redTeam,
        blueTeam: draft.blueTeam,
        cupHits: draft.cupHits,
        actions: {
            setPlayerTeam: draft.actions.setPlayerTeam,
            setMoveCount: draft.actions.setMoveCount,
            recordCupHit: draft.actions.recordCupHit,
            undoCupHit: draft.actions.undoCupHit,
        },
    };
}

/** For the entry modals: closes them once their live match ended, so the screen below says why */
export function useCloseWhenEnded(isEnded: boolean) {
    const nav = useNavigation();
    const closed = useRef(false);

    useEffect(() => {
        if (!isEnded || closed.current) return;
        closed.current = true;
        nav.goBack();
    }, [isEnded, nav]);
}
