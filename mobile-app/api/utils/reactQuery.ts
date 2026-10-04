import { Query, QueryKey, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { ConsoleLogger } from '@/utils/logging';

export const QK = {
    group: 'group',
    season: 'season',
    players: 'players',
    matches: 'matches',
    seasons: 'seasons',
    rules: 'rules',
    ruleMoves: 'ruleMoves',
    profiles: 'profiles',
    assets: 'assets',
    /** `[group, groupId, liveMatches]`: the group's matches in progress */
    liveMatches: 'liveMatches',
    /** `[group, groupId, liveMatch, id]`: one live match, in any status */
    liveMatch: 'liveMatch',

    groupCode: 'groupCode',
};

/**
 * a query like `[QK.group, groupId, QK.season, seasonId, QK.players]` will be matched by `[QK.group, groupId, QK.season, "*", QK.players]`
 */
export const replaceWildcards =
    (patternKey: string[], options = { startsWith: false }) =>
    (query: Query<unknown, Error, unknown, QueryKey>) => {
        const actualKey = query.queryKey as string[];

        const sameLength = patternKey.length === actualKey.length;

        if (!options.startsWith && !sameLength) return false;

        return patternKey.every((item, idx) => {
            return item === '*' || item === actualKey[idx];
        });
    };

export const queryKeyStartsWith =
    (key: string[]) => (query: Query<unknown, Error, unknown, QueryKey>) => {
        return query.queryKey
            .slice(0, key.length)
            .every((v, i) => v === key[i]);
    };

export function useQueryInvalidation() {
    const qc = useQueryClient();

    function invalidateMatches(groupId: string, seasonId: string) {
        ConsoleLogger.info('useQueryInvalidation.invalidateMatches');

        return qc.invalidateQueries({
            predicate: queryKeyStartsWith([
                QK.group,
                groupId,
                QK.season,
                seasonId,
                QK.matches,
            ]),
        });
    }
    function invalidatePlayers(groupId: string, seasonId: string) {
        ConsoleLogger.info('useQueryInvalidation.invalidatePlayers');

        return qc.invalidateQueries({
            predicate: queryKeyStartsWith([
                QK.group,
                groupId,
                QK.season,
                seasonId,
                QK.players,
            ]),
        });
    }
    function invalidateRules(groupId: string, seasonId: string) {
        ConsoleLogger.info('useQueryInvalidation.invalidateRules');

        return qc.invalidateQueries({
            predicate: queryKeyStartsWith([
                QK.group,
                groupId,
                QK.season,
                seasonId,
                QK.rules,
            ]),
        });
    }
    function invalidateLeaderboard(groupId: string) {
        ConsoleLogger.info('useQueryInvalidation.invalidateLeaderboard');

        return qc.invalidateQueries({
            predicate: replaceWildcards([
                QK.group,
                groupId,
                QK.season,
                '*',
                QK.players,
                '*',
            ]),
        });
    }
    return {
        invalidateMatches,
        invalidatePlayers,
        invalidateRules,
        invalidateLeaderboard,
    };
}

/**
 * usage: `<RefreshControl {...refresh} />`
 */
export interface RefreshProps {
    refreshing: boolean;
    onRefresh?: () => void;
}

export function usePullToRefresh(
    func: () => Promise<unknown> | void
): RefreshProps {
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await func();
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (err) {}
        setRefreshing(false);
    };
    return { refreshing, onRefresh };
}
