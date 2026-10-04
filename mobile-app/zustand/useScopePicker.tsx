import { createContext, useContext } from 'react';
import { SharedValue, useSharedValue } from 'react-native-reanimated';
import { create } from 'zustand';

import { RankingAlgorithm } from '@/constants/rankingAlgorithms';
import { useSelectedGroupId } from '@/zustand/group/stateGroupStore';

const ScopePickerContext = createContext<{
    leaderboardSwiperProgress: SharedValue<number>;
    pastSeasonsSwiperProgress: SharedValue<number>;
} | null>(null);

export function ScopePickerProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const leaderboardSwiperProgress = useSharedValue(0);
    const pastSeasonsSwiperProgress = useSharedValue(0);

    return (
        <ScopePickerContext.Provider
            value={{
                leaderboardSwiperProgress,
                pastSeasonsSwiperProgress,
            }}
        >
            {children}
        </ScopePickerContext.Provider>
    );
}

type GroupScope = {
    /** overrides the season's own ranking algorithm while browsing */
    rankingAlgorithm?: RankingAlgorithm;
    isPastSeasonsMode?: boolean;
};

const useScopePickerStore = create<{ groups: Record<string, GroupScope> }>()(
    () => ({ groups: {} })
);

function updateGroup(groupId: string, update: GroupScope) {
    useScopePickerStore.setState(({ groups }) => ({
        groups: { ...groups, [groupId]: { ...groups[groupId], ...update } },
    }));
}

const noScope: GroupScope = {};

/** The leaderboard/matches scope of the selected group, shared by every screen that shows it. */
export function useScopePicker() {
    const groupId = useSelectedGroupId();

    const scope = useScopePickerStore(
        (s) => (groupId ? s.groups[groupId] : undefined) ?? noScope
    );

    const context = useContext(ScopePickerContext);
    if (!context) {
        throw new Error(
            'useScopePicker must be used within a ScopePickerProvider'
        );
    }

    return {
        isPastSeasonsMode: scope.isPastSeasonsMode ?? false,
        rankingAlgorithm: scope.rankingAlgorithm,
        setRankingAlgorithm: (
            rankingAlgorithm: RankingAlgorithm | undefined
        ) => {
            if (groupId) updateGroup(groupId, { rankingAlgorithm });
        },
        setIsPastSeasonsMode: (isPastSeasonsMode: boolean) => {
            if (groupId) updateGroup(groupId, { isPastSeasonsMode });
        },
        leaderboardSwiperProgress: context.leaderboardSwiperProgress,
        pastSeasonsSwiperProgress: context.pastSeasonsSwiperProgress,
    };
}
