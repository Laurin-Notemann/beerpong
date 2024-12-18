import { MatchesListProps } from '@/components/MatchesList';

import { useMatchesQuery } from '../calls/matchHooks';
import { usePlayersQuery } from '../calls/playerHooks';
import { useMoves } from '../calls/ruleHooks';
import { useGroup } from '../calls/seasonHooks';
import { ScreenState } from '../types';
import { matchDtoToMatch } from '../utils/matchDtoToMatch';

export const useMatchlistProps = (): ScreenState<MatchesListProps> => {
    const { groupId, seasonId } = useGroup();

    const playersQuery = usePlayersQuery(groupId, seasonId);

    const { data, ...screenState } = useMatchesQuery(groupId, seasonId);

    const movesQuery = useMoves(groupId, seasonId);

    if (!data?.data) return { props: null, ...screenState };

    const allowedMoves = movesQuery.data?.data ?? [];

    const matches = data.data.map(
        matchDtoToMatch(playersQuery.data?.data, allowedMoves)
    );

    const props: MatchesListProps = { matches };

    return {
        props,
        ...screenState,
    };
};
