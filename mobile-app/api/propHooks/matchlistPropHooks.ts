import { useMatchesQuery } from '@/api/calls/matchHooks';
import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { ScreenState } from '@/api/types';
import { Match, matchDtoToMatch } from '@/api/utils/matchDtoToMatch';
import { usePullToRefresh, useQueryInvalidation } from '@/api/utils/reactQuery';
import { useNavigation } from '@/app/navigation/useNavigation';
import { MatchesListProps } from '@/components/MatchesList';

export const useMatchlistProps = (): ScreenState<MatchesListProps> => {
    const { groupId, seasonId } = useGroup();

    const nav = useNavigation();

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

    function onMatchPress(match: Match) {
        nav.navigate('match', { id: match.id, scope: seasonId! });
    }

    const props: MatchesListProps = { matches, refresh, onMatchPress };

    return {
        props,
        ...screenState,
    };
};
