import { useMemo } from 'react';

import { useMatchesQuery } from '@/api/calls/matchHooks';
import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { ScreenState } from '@/api/types';
import { Match, matchDtoToMatch } from '@/api/utils/matchDtoToMatch';
import { usePullToRefresh, useQueryInvalidation } from '@/api/utils/reactQuery';
import { MatchesListProps } from '@/components/MatchesList';
import { useNavigation } from '@/lib/navigation/useNavigation';

export const useMatchlistProps = (): ScreenState<MatchesListProps> => {
    const { groupId, seasonId } = useGroup();

    const nav = useNavigation();

    const playersQuery = usePlayersQuery(groupId, seasonId);

    const matchesQuery = useMatchesQuery(groupId, seasonId);

    const movesQuery = useMoves(groupId, seasonId);

    const isLoading =
        playersQuery.isLoading ||
        matchesQuery.isLoading ||
        movesQuery.isLoading;

    const error = playersQuery.error ?? matchesQuery.error ?? movesQuery.error;

    const { invalidateMatches } = useQueryInvalidation();

    const refresh = usePullToRefresh(() =>
        invalidateMatches(groupId!, seasonId!)
    );

    const matchDtos = matchesQuery.data?.data;
    const players = playersQuery.data?.data;
    const allowedMoves = movesQuery.data?.data;
    const matches = useMemo(
        () => matchDtos?.map(matchDtoToMatch(players, allowedMoves)),
        [matchDtos, players, allowedMoves]
    );

    if (!matches) return { props: null, isLoading, error };

    function onMatchPress(match: Match) {
        nav.navigate('match', { id: match.id, seasonId: match.seasonId });
    }

    const props: MatchesListProps = { matches, refresh, onMatchPress };

    return {
        props,
        isLoading,
        error,
    };
};
