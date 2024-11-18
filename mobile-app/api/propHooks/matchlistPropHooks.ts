import { MatchesListProps } from '@/components/MatchesList';

import { useMatchesQuery } from '../calls/matchHooks';
import { useGroup } from '../calls/seasonHooks';
import { ScreenState } from '../types';

export const useMatchlistProps = (): ScreenState<MatchesListProps> => {
    const { groupId, seasonId } = useGroup();

    const { data, ...screenState } = useMatchesQuery(groupId, seasonId);

    const props: MatchesListProps | null = data?.data
        ? {
              matches:
                  data.data.map((i) => ({
                      blueCups: 0,
                      redCups: 0,
                      date: new Date(i.date!),
                      redTeam: [{ name: 'Unknown' }, { name: 'Unknown' }],
                      blueTeam: [{ name: 'Unknown' }, { name: 'Unknown' }],
                  })) ?? [],
          }
        : null;

    return {
        props,
        ...screenState,
    };
};
