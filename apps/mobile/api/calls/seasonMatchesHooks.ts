import {
    QueryObserverResult,
    useQueries,
    useQueryClient,
} from '@tanstack/react-query';
import { useMemo } from 'react';

import {
    leaderboardQueryOptions,
    LeaderboardScope,
} from '@/api/calls/leaderboardHooks';
import { matchesQueryOptions } from '@/api/calls/matchHooks';
import { useQueuedMatches, withQueuedMatches } from '@/api/calls/matchQueue';
import { playersQueryOptions } from '@/api/calls/playerHooks';
import { movesQueryOptions } from '@/api/calls/ruleHooks';
import { Player, toPlayer } from '@/api/calls/seasonHooks';
import { ApiId, WithProfile } from '@/api/types';
import { useApi } from '@/api/utils/create-api';
import { Match, matchDtoToMatch } from '@/api/utils/matchDtoToMatch';
import { PlayerDto } from '@/openapi/openapi';

// Module-level, so useQueries only recombines when a result changes; its output is
// structurally shared, so `data` keeps its identity while nothing changed.
const combine = <T>(results: QueryObserverResult<T>[]) => ({
    data: results.map((i) => i.data),
    isLoading: results.some((i) => i.isLoading),
    error: results.find((i) => i.error)?.error ?? null,
});

/**
 * The matches of the given seasons, ready to show, by season id. A season's matches are
 * converted once its matches, players (deleted ones too, they still played) and moves have
 * all loaded. Only the seasons asked for are loaded, so a past season loads when a screen
 * shows it. Matches entered on this phone that the server doesn't have yet are listed too
 * (`Match.isQueued`).
 */
export function useSeasonMatches(groupId: ApiId | null, seasonIds: ApiId[]) {
    const { api } = useApi();
    const qc = useQueryClient();

    const matches = useQueries({
        queries: seasonIds.map((id) => matchesQueryOptions(api, groupId, id)),
        combine,
    });
    const players = useQueries({
        queries: seasonIds.map((id) =>
            playersQueryOptions(api, qc, groupId, id)
        ),
        combine,
    });
    const moves = useQueries({
        queries: seasonIds.map((id) => movesQueryOptions(api, groupId, id)),
        combine,
    });
    const queued = useQueuedMatches(groupId);

    const { matchesBySeason, playersBySeason } = useMemo(() => {
        const out = {
            matchesBySeason: new Map<ApiId, Match[]>(),
            playersBySeason: new Map<ApiId, WithProfile<PlayerDto>[]>(),
        };
        seasonIds.forEach((id, idx) => {
            const dtos = matches.data[idx]?.data;
            const seasonPlayers = players.data[idx]?.data;
            const seasonMoves = moves.data[idx]?.data;
            if (seasonPlayers) out.playersBySeason.set(id, seasonPlayers);
            if (dtos && seasonPlayers && seasonMoves) {
                const all = withQueuedMatches(dtos, queued, id);
                const convert = matchDtoToMatch(seasonPlayers, seasonMoves);
                out.matchesBySeason.set(
                    id,
                    all.matches.map((dto) =>
                        all.queuedIds.has(dto.id)
                            ? { ...convert(dto), isQueued: true }
                            : convert(dto)
                    )
                );
            }
        });
        return out;
    }, [seasonIds, matches.data, players.data, moves.data, queued]);

    return {
        matchesBySeason,
        playersBySeason,
        isLoading: matches.isLoading || players.isLoading || moves.isLoading,
        error: matches.error ?? players.error ?? moves.error,
    };
}

/** The season leaderboards (ranked players) of the given seasons, by season id. */
export function useSeasonLeaderboards(
    groupId: ApiId | null,
    seasonIds: ApiId[]
) {
    const { api } = useApi();
    const qc = useQueryClient();

    const leaderboards = useQueries({
        queries: seasonIds.map((id) =>
            leaderboardQueryOptions(
                api,
                qc,
                groupId,
                id,
                LeaderboardScope.SEASON
            )
        ),
        combine,
    });

    const leaderboardBySeason = useMemo(() => {
        const out = new Map<ApiId, Player[]>();
        seasonIds.forEach((id, idx) => {
            const entries = leaderboards.data[idx]?.data?.entries;
            if (entries) out.set(id, entries.map(toPlayer));
        });
        return out;
    }, [seasonIds, leaderboards.data]);

    return {
        leaderboardBySeason,
        isLoading: leaderboards.isLoading,
        error: leaderboards.error,
    };
}
