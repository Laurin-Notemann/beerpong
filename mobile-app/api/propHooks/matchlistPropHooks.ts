import { mockMatches } from '@/components/mockData/matches';
import { useGroupStore } from '@/zustand/group/stateGroupStore';

import { useGroupQuery } from '../calls/groupHooks';
import { useMatchesQuery } from '../calls/matchHooks';

export interface Match {
    date: Date;
    blueTeam: { name: string }[];
    redTeam: { name: string }[];
    blueCups: number;
    redCups: number;
}

export const useMatchlistProps = () => {
    const { selectedGroupId } = useGroupStore();
    const { data: groupQueryData } = useGroupQuery(selectedGroupId);
    const { data } = useMatchesQuery(
        selectedGroupId,
        groupQueryData?.data?.activeSeason?.id ?? null
    );

    if (!data?.data) {
        return { matches: [] };
    }

    const out: { matches: Match[] } = {
        matches: mockMatches,
        /*
            data?.data?.map((match) => {
                return {
                    date: new Date(match.date ?? ''),
                    blueTeam: [{ name: 'NO NAME FOUND' }],
                    redTeam: [{ name: 'NO NAME FOUND' }],
                    blueCups: 0,
                    redCups: 0,
                };
            }) ?? [],
        */
    };

    return out;
};
