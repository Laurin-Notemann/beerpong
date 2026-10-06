import { useEffect, useRef } from 'react';

import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import {
    useLiveMatch,
    useLiveMatchActions,
} from '@/api/liveMatch/useLiveMatch';
import { showScoreClipToast } from '@/components/ScoreClipToast';
import { CupHit, CupTeam } from '@/lib/cupHits';
import { useNavigation } from '@/lib/navigation/useNavigation';
import type { Rerack } from '@/lib/rerack';
import { randomScoreClip, scoreClipsOf } from '@/lib/scoreClips';
import { useScoreClipPreload } from '@/lib/useScoreClipPreload';
import { useLocalSettingsStore } from '@/zustand/localSettingsStore';
import { useMatchDraftStore } from '@/zustand/matchDraftStore';
import { useReracks, useRerackStore } from '@/zustand/rerackStore';

/**
 * The teams, cup hits, re-racks, misses and entry actions of the match being entered: the live match with this id,
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
    const draftReracks = useReracks();
    const { setRerack: setDraftRerack } = useRerackStore((s) => s.actions);
    const liveSeasonId = live.liveMatch?.seasonId || activeSeasonId;
    const players = usePlayersQuery(groupId, liveSeasonId).data?.data;
    const scoreClipToasts = useLocalSettingsStore((s) => s.scoreClipToasts);

    const livePlayerIds = new Set(
        [
            ...live.state.blueTeam.teamMembers,
            ...live.state.redTeam.teamMembers,
        ].map((i) => i.playerId)
    );
    useScoreClipPreload(
        liveMatchId &&
            scoreClipToasts &&
            live.liveMatch?.status === 'IN_PROGRESS'
            ? (players ?? [])
                  .filter((i) => livePlayerIds.has(i.id))
                  .flatMap((i) => scoreClipsOf(i.profile))
            : []
    );

    if (liveMatchId) {
        const header = live.liveMatch;
        const members = (team: 'red' | 'blue') =>
            (team === 'red' ? live.state.redTeam : live.state.blueTeam)
                .teamMembers;
        // like Versus TV: a cup hit, or a point added, plays one of the scorer's clips
        const playScoreClip = (playerId: string) => {
            if (!scoreClipToasts) return;
            const team = (['blue', 'red'] as const).find((i) =>
                members(i).some((m) => m.playerId === playerId)
            );
            const profile = players?.find((i) => i.id === playerId)?.profile;
            const url = randomScoreClip(profile);
            if (!team || !url) return;
            showScoreClipToast({
                url,
                name: profile?.name ?? '',
                team,
            });
        };

        return {
            seasonId: liveSeasonId,
            /** finished or discarded, e.g. on another phone; edits are ignored then */
            isEnded: !!header && header.status !== 'IN_PROGRESS',
            redTeam: live.state.redTeam,
            blueTeam: live.state.blueTeam,
            cupHits: live.state.cupHits,
            reracks: live.state.reracks,
            misses: live.state.misses,
            actions: {
                setPlayerTeam: liveActions.setPlayerTeam,
                setMoveCount: (
                    playerId: string,
                    moveId: string,
                    count: number
                ) => {
                    const current =
                        [...members('red'), ...members('blue')]
                            .find((i) => i.playerId === playerId)
                            ?.moves.find((i) => i.moveId === moveId)?.count ??
                        0;
                    liveActions.setMoveCount(playerId, moveId, count);
                    if (count > current) playScoreClip(playerId);
                },
                recordCupHit: (hit: CupHit) => {
                    liveActions.recordCupHit(hit);
                    playScoreClip(hit.playerId);
                },
                undoCupHit: liveActions.undoCupHit,
                setRerack: liveActions.setRerack,
                recordMiss: liveActions.recordMiss,
                undoMiss: liveActions.undoMiss,
            },
        };
    }

    return {
        seasonId: activeSeasonId,
        isEnded: false,
        redTeam: draft.redTeam,
        blueTeam: draft.blueTeam,
        cupHits: draft.cupHits,
        reracks: draftReracks ?? {},
        // only live matches track misses
        misses: [],
        actions: {
            setPlayerTeam: draft.actions.setPlayerTeam,
            setMoveCount: draft.actions.setMoveCount,
            recordCupHit: draft.actions.recordCupHit,
            undoCupHit: draft.actions.undoCupHit,
            setRerack: (team: CupTeam, rerack?: Rerack) =>
                setDraftRerack('draft', team, rerack),
            recordMiss: (_playerId: string) => {},
            undoMiss: (_playerId: string) => {},
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
