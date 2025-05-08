import { Query, QueryKey, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export const QK = {
    group: 'group',
    season: 'season',
    players: 'players',
    matches: 'matches',
    seasons: 'seasons',
    rules: 'rules',
    ruleMoves: 'ruleMoves',

    groupCode: 'groupCode',
};

const areArraysIdentical = <T>(arr1: T[], arr2: T[]): boolean => {
    if (arr1.length !== arr2.length) {
        return false;
    }
    return arr1.every((value, index) => value === arr2[index]);
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
        qc.invalidateQueries({
            predicate: queryKeyStartsWith([
                QK.group,
                groupId,
                QK.season,
                seasonId,
                QK.matches,
            ]),
        });
    }
    return { invalidateMatches };
}

export function usePullToRefresh(func: () => void) {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const onRefresh = async () => {
        setIsRefreshing(true);
        try {
            await func();
        } catch (err) {}
        setIsRefreshing(false);
    };
    return { isRefreshing, onRefresh };
}
