import { useGroup } from '@/api/calls/seasonHooks';
import {
    useLiveMatch,
    useLiveMatchActions,
} from '@/api/liveMatch/useLiveMatch';
import { useMatchDraftStore } from '@/zustand/matchDraftStore';

/**
 * The teams, cup hits and entry actions of the match being entered: the live match with this id,
 * or the local draft when there is none. Both sources are always subscribed (hooks can't be
 * conditional); the one that isn't used is idle, since an empty id never queries or finds an entry.
 */
export function useMatchEntry(liveMatchId?: string) {
    const { groupId } = useGroup();

    const draft = useMatchDraftStore();
    const live = useLiveMatch(groupId ?? '', liveMatchId ?? '');
    const liveActions = useLiveMatchActions(groupId ?? '', liveMatchId ?? '');

    if (liveMatchId) {
        return {
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
