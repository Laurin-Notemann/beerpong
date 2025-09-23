import { createContext, useContext, useEffect } from 'react';
import { SharedValue, useSharedValue } from 'react-native-reanimated';
import { create } from 'zustand';

import { LeaderboardScope } from '@/api/calls/leaderboardHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { RankingAlgorithm } from '@/constants/rankingAlgorithms';

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

interface ScopePickerStore {
    groups: Record<
        string,
        {
            rankingAlgorithm: RankingAlgorithm | undefined;
            globalScope: LeaderboardScope;
            pastSeasonId: string | undefined;
            isPastSeasonsMode: boolean;
            leaderboardPageIndex: number | undefined;
            pastSeasonsPageIndex: number | undefined;
        }
    >;
    actions: {
        setRankingAlgorithm: (
            groupId: string,
            rankingAlgorithm: RankingAlgorithm | undefined
        ) => void;
        setGlobalScope: (groupId: string, scope: LeaderboardScope) => void;
        setPastSeasonId: (groupId: string, seasonId: string) => void;
        setIsPastSeasonsMode: (
            groupId: string,
            isPastSeasonsMode: boolean
        ) => void;
        setLeaderboardPageIndex: (groupId: string, pageIdx: number) => void;
        setPastSeasonsPageIndex: (groupId: string, pageIdx: number) => void;
    };
}

const useScopePickerStore = create<ScopePickerStore>()((set, get) => ({
    groups: {},
    actions: {
        setRankingAlgorithm: (groupId, rankingAlgorithm) =>
            set({
                groups: {
                    ...get().groups,
                    [groupId]: {
                        ...(get().groups[groupId] ?? {}),
                        rankingAlgorithm: rankingAlgorithm,
                    },
                },
            }),
        setGlobalScope: (groupId, scope) =>
            set({
                groups: {
                    ...get().groups,
                    [groupId]: {
                        ...(get().groups[groupId] ?? {}),
                        globalScope: scope,
                    },
                },
            }),
        setPastSeasonId: (groupId, seasonId) =>
            set({
                groups: {
                    ...get().groups,
                    [groupId]: {
                        ...(get().groups[groupId] ?? {}),
                        pastSeasonId: seasonId,
                    },
                },
            }),
        setIsPastSeasonsMode: (groupId, isPastSeasonsMode) =>
            set({
                groups: {
                    ...get().groups,
                    [groupId]: {
                        ...(get().groups[groupId] ?? {}),
                        isPastSeasonsMode,
                    },
                },
            }),
        setLeaderboardPageIndex: (groupId, pageIdx) =>
            set({
                groups: {
                    ...get().groups,
                    [groupId]: {
                        ...(get().groups[groupId] ?? {}),
                        leaderboardPageIndex: pageIdx,
                    },
                },
            }),
        setPastSeasonsPageIndex: (groupId, pageIdx) =>
            set({
                groups: {
                    ...get().groups,
                    [groupId]: {
                        ...(get().groups[groupId] ?? {}),
                        pastSeasonsPageIndex: pageIdx,
                    },
                },
            }),
    },
}));

export function useScopePicker() {
    const { groupId } = useGroup();

    const { groups, actions } = useScopePickerStore();

    const context = useContext(ScopePickerContext);

    if (!context) {
        throw new Error(
            'useScopePicker must be used within a ScopePickerProvider'
        );
    }

    const leaderboardSwiperProgress = context.leaderboardSwiperProgress;
    const pastSeasonsSwiperProgress = context.pastSeasonsSwiperProgress;

    // when switching groups
    useEffect(() => {
        // TODO: without the timeout, this is glitchy, and with the timeout it does nothing (maybe because of the defaultPageIdx in useControlledSwiper?)
        // setTimeout(() => {
        //     leaderboardSwiperProgress.value =
        //         groups[groupId!]?.leaderboardPageIndex ?? 0;
        //     pastSeasonsSwiperProgress.value =
        //         groups[groupId!]?.pastSeasonsPageIndex ?? 0;
        // }, 0);
    }, [groupId]);

    const defaults = {
        isPastSeasonsMode: false,
        leaderboardPageIndex: 0,
        pastSeasonsPageIndex: 0,
    } as const;

    return {
        ...defaults,
        ...(groups[groupId!] ?? {}),
        setRankingAlgorithm: (rankingAlgorithm: RankingAlgorithm | undefined) =>
            actions.setRankingAlgorithm(groupId!, rankingAlgorithm),
        setGlobalScope: (scope: LeaderboardScope) =>
            actions.setGlobalScope(groupId!, scope),
        setPastSeasonId: (seasonId: string) =>
            actions.setPastSeasonId(groupId!, seasonId),
        setIsPastSeasonsMode: (isPastSeasonsMode: boolean) =>
            actions.setIsPastSeasonsMode(groupId!, isPastSeasonsMode),
        setLeaderboardPageIndex: (pageIdx: number) => {
            actions.setLeaderboardPageIndex(groupId!, pageIdx);

            leaderboardSwiperProgress.value = pageIdx;
        },
        setPastSeasonsPageIndex: (pageIdx: number) => {
            actions.setPastSeasonsPageIndex(groupId!, pageIdx);

            pastSeasonsSwiperProgress.value = pageIdx;
        },
        leaderboardSwiperProgress,
        pastSeasonsSwiperProgress,
    };
}
