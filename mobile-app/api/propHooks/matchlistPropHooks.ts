import { useMatchesQuery } from '@/api/calls/matchHooks';
import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { ScreenState } from '@/api/types';
import { matchDtoToMatch } from '@/api/utils/matchDtoToMatch';
import { usePullToRefresh, useQueryInvalidation } from '@/api/utils/reactQuery';
import { MatchesListProps } from '@/components/MatchesList';

export const useMatchlistProps = (): ScreenState<MatchesListProps> => {
    const { groupId, seasonId } = useGroup();

    const playersQuery = usePlayersQuery(groupId, seasonId);

    const { data, ...screenState } = useMatchesQuery(groupId, seasonId);

    const movesQuery = useMoves(groupId, seasonId);

    const { invalidateMatches } = useQueryInvalidation();

    const refresh = usePullToRefresh(() =>
        invalidateMatches(groupId!, seasonId!)
    );

    if (!data?.data) return { props: null, ...screenState };

    const allowedMoves = movesQuery.data?.data ?? [];

    const matches = data.data.map(
        matchDtoToMatch(playersQuery.data?.data, allowedMoves)
    );

    const props: MatchesListProps = { matches, refresh };

    return {
        props,
        ...screenState,
    };
};
