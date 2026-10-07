import { useMemo } from 'react';

import { useLiveMatchesQuery } from '@/api/calls/liveMatchHooks';
import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { toView } from '@/api/liveMatch/useLiveMatch';
import { ApiId } from '@/api/types';
import { cupsPerHit } from '@/api/utils/ruleMoveCups';
import type { TeamBadgePlayer } from '@/components/liveMatch/TeamBadge';
import { CupTeam } from '@/lib/cupHits';
import { isIncomplete } from '@/lib/liveMatch/cache';
import { groupLiveMatches, primaryLiveMatch } from '@/lib/liveMatch/dock';
import { teamScore } from '@/lib/liveMatch/log';
import type { LiveMatchState } from '@/lib/liveMatch/types';
import type { RuleMoveDto } from '@/openapi/openapi';
import { useLiveMatchOutboxStore } from '@/zustand/liveMatchOutboxStore';

export interface GroupLiveMatch {
    tournamentId?: string;
    tournamentStage?: string;
    id: string;
    seasonId: string;
    /** the server's start, or when this phone started it while the server doesn't have it */
    startedAt: string;
    /** started on this phone and not on the server yet */
    isPendingCreate: boolean;
    /** with this phone's unconfirmed edits */
    state: LiveMatchState;
    /** the server's lastSeq while `state` is exactly the server's log: nothing pending, no op missing */
    syncedSeq?: number;
}

/**
 * The group's live matches in progress, most recently active first, including those this phone
 * started offline, plus the one the dock shows (`primary`). Pass no group to get none.
 */
export function useGroupLiveMatches(groupId: ApiId | null | undefined) {
    const listQuery = useLiveMatchesQuery(groupId);
    const entries = useLiveMatchOutboxStore((s) => s.entries);
    const lastOpenedId = useLiveMatchOutboxStore((s) =>
        groupId ? s.lastOpenedLiveMatchId[groupId] : undefined
    );

    const matches = useMemo<GroupLiveMatch[]>(() => {
        if (!groupId) return [];

        return groupLiveMatches(groupId, listQuery.data ?? [], entries).map(
            (i) => {
                const { header, state } = toView(
                    groupId,
                    i.id,
                    i.server,
                    i.entry
                );
                const pending =
                    !!i.entry?.pendingCreate || !!i.entry?.pendingOps.length;
                return {
                    id: i.id,
                    seasonId: header?.seasonId ?? '',
                    tournamentId: header?.tournamentId,
                    tournamentStage: header?.tournamentStage,
                    startedAt: header?.startedAt ?? '',
                    isPendingCreate: i.isPendingCreate,
                    state,
                    syncedSeq:
                        i.server && !pending && !isIncomplete(i.server)
                            ? i.server.lastSeq
                            : undefined,
                };
            }
        );
    }, [groupId, listQuery.data, entries]);

    return { matches, primary: primaryLiveMatch(matches, lastOpenedId) };
}

export interface LiveMatchTeam {
    players: TeamBadgePlayer[];
    score: number;
}

type SeasonPlayers = NonNullable<
    ReturnType<typeof usePlayersQuery>['data']
>['data'];

/** both teams of a live match as badges and scores, from its season's players and rules */
export function liveMatchTeams(
    state: LiveMatchState,
    players: SeasonPlayers | undefined,
    moves: RuleMoveDto[] | undefined
) {
    const byId = new Map((players ?? []).map((i) => [i.id, i]));
    const cups = (moves ?? []).flatMap((i) =>
        i.id ? [{ id: i.id, cups: cupsPerHit(i) }] : []
    );

    const team = (side: CupTeam): LiveMatchTeam => ({
        players: (side === 'red'
            ? state.redTeam
            : state.blueTeam
        ).teamMembers.map((i) => {
            const player = byId.get(i.playerId);
            return {
                id: i.playerId,
                // blank while the players load, so nobody shows up as "Unknown" for a moment
                name: player?.profile?.name || (players ? 'Unknown' : ''),
                avatarUrl: player?.profile?.avatarUrl,
            };
        }),
        score: teamScore(state, side, cups),
    });

    return { red: team('red'), blue: team('blue') };
}

/** `liveMatchTeams` with the match's own season's players and rules */
export function useLiveMatchTeams(
    groupId: ApiId | null | undefined,
    match: Pick<GroupLiveMatch, 'seasonId' | 'state'>
) {
    const seasonId = match.seasonId || null;
    const players = usePlayersQuery(groupId ?? null, seasonId).data?.data;
    const moves = useMoves(groupId ?? null, seasonId).data?.data;
    const { state } = match;

    return useMemo(
        () => liveMatchTeams(state, players, moves),
        [players, moves, state]
    );
}
