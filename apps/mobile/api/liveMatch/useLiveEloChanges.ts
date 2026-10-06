import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
    LeaderboardScope,
    useGetLeaderboardQuery,
} from '@/api/calls/leaderboardHooks';
import { useGroupLiveMatches } from '@/api/liveMatch/useGroupLiveMatches';
import { ApiId } from '@/api/types';
import { useApi } from '@/api/utils/create-api';
import { QK } from '@/api/utils/reactQuery';
import { toTeamCreateDtos } from '@/lib/liveMatch/log';

/** a player's first match starts them at the API's 1500 */
const STARTING_ELO = 1500;

/**
 * How much each player's season Elo changes (by season player id) if the season's live matches
 * all ended now: the projection Versus TV and the "Live matches" widget show. Empty while it
 * loads or offline; the last numbers stay while a new score is projected.
 */
export function useLiveEloChanges(
    groupId: ApiId | null | undefined,
    seasonId: ApiId | null | undefined
) {
    const { api } = useApi();
    const { matches } = useGroupLiveMatches(groupId);
    const stored = useGetLeaderboardQuery(
        groupId ?? null,
        seasonId,
        LeaderboardScope.SEASON
    ).data?.data?.entries;

    // like the TV: the season's matches with players on both sides
    const projected = matches
        .filter((i) => i.seasonId === seasonId)
        .map((i) => ({ teams: toTeamCreateDtos(i.state) }))
        .filter((i) => i.teams.every((t) => t.teamMembers?.length));

    const projection = useQuery({
        queryKey: [
            QK.group,
            groupId,
            QK.season,
            seasonId,
            QK.players,
            'projection',
            projected,
        ],
        enabled: !!groupId && !!seasonId && projected.length > 0,
        placeholderData: keepPreviousData,
        queryFn: async () => {
            const res = await (
                await api
            ).getLeaderboardProjection(
                {
                    groupId: groupId!,
                    scope: LeaderboardScope.SEASON,
                    seasonId: seasonId!,
                },
                { matches: projected }
            );
            return res.data.data?.entries ?? [];
        },
    });

    const changes = new Map<string, number>();
    if (!stored || !projection.data || !projected.length) return changes;

    const before = new Map(stored.map((i) => [i.id, i.statistics?.elo]));
    const playing = new Set(
        projected.flatMap((i) =>
            i.teams.flatMap((t) => t.teamMembers?.map((m) => m.playerId))
        )
    );
    for (const entry of projection.data) {
        if (!entry.id || !playing.has(entry.id)) continue;
        changes.set(
            entry.id,
            (entry.statistics?.elo ?? STARTING_ELO) -
                (before.get(entry.id) ?? STARTING_ELO)
        );
    }
    return changes;
}
