import { MatchesListProps } from '@/components/MatchesList';

import { useMatchesQuery } from '../calls/matchHooks';
import { useGroup } from '../calls/seasonHooks';

export const useMatchlistProps = () => {
    const { groupId, seasonId } = useGroup();

    const { data } = useMatchesQuery(groupId, seasonId);

    if (!data?.data) {
        return { matches: [] };
    }

    const props: MatchesListProps = {
        matches:
            data?.data.map((i) => ({
                blueCups: 0,
                redCups: 0,
                date: new Date(i.date!),
                redTeam: [{ name: 'Unknown' }, { name: 'Unknown' }],
                blueTeam: [{ name: 'Unknown' }, { name: 'Unknown' }],
            })) ?? [],
    };

    return props;
};
