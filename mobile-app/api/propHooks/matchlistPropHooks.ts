import { useMatchesQuery } from '@/api/calls/matchHooks';
import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useProfilesQuery } from '@/api/calls/profileHooks';
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
    const profilesQuery = useProfilesQuery(groupId);

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

    if (!matchesQuery.data?.data) return { props: null, isLoading, error };

    const allowedMoves = movesQuery.data?.data ?? [];

    const matches = matchesQuery.data.data.map(
        matchDtoToMatch(
            playersQuery.data?.data,
            profilesQuery.data?.data,
            allowedMoves
        )
    );

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
