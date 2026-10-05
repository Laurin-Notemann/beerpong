import { useGroup } from '@/api/calls/seasonHooks';
import { useSeasonMatches } from '@/api/calls/seasonMatchesHooks';
import { ScreenState } from '@/api/types';
import { Match } from '@/api/utils/matchDtoToMatch';
import { usePullToRefresh, useQueryInvalidation } from '@/api/utils/reactQuery';
import { MatchesListProps } from '@/components/MatchesList';
import { useNavigation } from '@/lib/navigation/useNavigation';

export const useMatchlistProps = (): ScreenState<MatchesListProps> => {
    const { groupId, seasonId } = useGroup();

    const nav = useNavigation();

    const { matchesBySeason, isLoading, error } = useSeasonMatches(
        groupId,
        seasonId ? [seasonId] : []
    );

    const { invalidateMatches } = useQueryInvalidation();

    const refresh = usePullToRefresh(() =>
        invalidateMatches(groupId!, seasonId!)
    );

    const matches = seasonId ? matchesBySeason.get(seasonId) : undefined;

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
