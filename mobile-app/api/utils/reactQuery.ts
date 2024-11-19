import { Query, QueryKey } from '@tanstack/react-query';

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

export const ignoreSeason =
    (queryKey: string[]) =>
    (query: Query<unknown, Error, unknown, QueryKey>) => {
        const filteredKey = (query.queryKey as string[]).filter(
            (item, idx, arr) =>
                !(item === QK.season || arr[idx - 1] === QK.season)
        );

        return areArraysIdentical(filteredKey, queryKey);
    };
