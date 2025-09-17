import React, { useEffect, useMemo } from 'react';
import { SafeAreaView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useAllSeasonsQuery, useGroup } from '@/api/calls/seasonHooks';
import { useMatchlistProps } from '@/api/propHooks/matchlistPropHooks';
import { matchDtoToMatch } from '@/api/utils/matchDtoToMatch';
import { AppBackground } from '@/app/Background';
import { PastSeasonsSwiper } from '@/app/pastSeasons';
import { useInsets } from '@/app/useInsets';
import ErrorScreen from '@/components/ErrorScreen';
import { LeaderboardScopePicker } from '@/components/Leaderboard/LeaderboardScopePicker';
import LoadingScreen from '@/components/LoadingScreen';
import MatchesList from '@/components/MatchesList';
import { Swiper, useControlledSwiper } from '@/components/Swiper';
import { useScopePicker } from '@/zustand/scopePickerStore';

export default function Screen() {
    const { props, isLoading, error } = useMatchlistProps();

    const insets = useInsets(true, true);
    const { groupId, seasonId, group } = useGroup();
    const scopePicker = useScopePicker();

    const seasonsQuery = useAllSeasonsQuery(groupId);
    const pastSeasons =
        seasonsQuery.data?.data
            ?.filter((i) => i.endDate != null)
            ?.filter((i) => i.numMatches > 0) ?? [];
    const groupHasPastSeasons = pastSeasons.length > 0;

    const leaderboardSwiper = useControlledSwiper(
        scopePicker.leaderboardSwiperProgress
    );
    const pastSeasonsSwiper = useControlledSwiper(
        scopePicker.pastSeasonsSwiperProgress
    );

    useEffect(() => {
        leaderboardSwiper.swiperProgress.value =
            scopePicker.leaderboardPageIndex ?? 0;
    }, [scopePicker.leaderboardPageIndex]);
    useEffect(() => {
        pastSeasonsSwiper.swiperProgress.value =
            scopePicker.pastSeasonsPageIndex ?? 0;
    }, [scopePicker.pastSeasonsPageIndex]);

    const wakeTime =
        group.data?.activeSeason?.seasonSettings?.wakeTimeHour ?? 0;
    const todayMatches = useMemo(() => {
        return props.matches.filter((m) => {
            const matchDate = new Date(m.date);
            const now = new Date();
            if (now.getHours() < wakeTime) now.setDate(now.getDate() - 1);
            now.setHours(wakeTime, 0, 0, 0);
            if (matchDate.getHours() < wakeTime)
                matchDate.setDate(matchDate.getDate() - 1);
            matchDate.setHours(wakeTime, 0, 0, 0);
            return matchDate.getTime() === now.getTime();
        });
    }, [props.matches, wakeTime]);

    const allTimeMatches = useMemo(() => {
        const seasons = seasonsQuery.data?.data ?? [];
        return seasons.flatMap(
            (s) =>
                (s.ruleMoves && s.rawPlayers
                    ? s.matches.map(matchDtoToMatch(s.rawPlayers, s.ruleMoves))
                    : []) as typeof props.matches
        );
    }, [seasonsQuery.data]);

    if (isLoading) return <LoadingScreen />;
    if (!props) return <ErrorScreen error={error} />;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <AppBackground />
            {!scopePicker.isPastSeasonsMode && (
                <Swiper
                    {...leaderboardSwiper}
                    ref={scopePicker.leaderboardSwiperRef}
                    defaultIndex={scopePicker.leaderboardPageIndex ?? 0}
                    onPageChange={(idx) =>
                        scopePicker.setLeaderboardPageIndex(idx)
                    }
                    key={groupId + ':' + seasonId}
                >
                    <SafeAreaView style={{ flex: 1 }}>
                        <MatchesList
                            contentContainerStyle={{
                                paddingTop: insets.top,
                                paddingBottom: insets.bottom + 48,
                            }}
                            {...props}
                            matches={todayMatches}
                        />
                    </SafeAreaView>
                    <SafeAreaView style={{ flex: 1 }}>
                        <MatchesList
                            contentContainerStyle={{
                                paddingTop: insets.top,
                                paddingBottom: insets.bottom + 48,
                            }}
                            {...props}
                        />
                    </SafeAreaView>
                    {groupHasPastSeasons && (
                        <SafeAreaView style={{ flex: 1 }}>
                            <MatchesList
                                contentContainerStyle={{
                                    paddingTop: insets.top,
                                    paddingBottom: insets.bottom + 48,
                                }}
                                {...props}
                                matches={allTimeMatches}
                            />
                        </SafeAreaView>
                    )}
                </Swiper>
            )}
            {scopePicker.isPastSeasonsMode && (
                <PastSeasonsSwiper
                    swiper={{
                        ...pastSeasonsSwiper,
                        ref: scopePicker.pastSeasonsSwiperRef,
                        defaultIndex: scopePicker.pastSeasonsPageIndex ?? 0,
                        onPageChange: (idx: number) =>
                            scopePicker.setPastSeasonsPageIndex(idx),
                    }}
                    rankingAlgorithm={undefined}
                />
            )}
            <SafeAreaView
                style={{
                    position: 'absolute',
                    bottom: insets.bottom + 4,
                    width: '100%',
                }}
            >
                <LeaderboardScopePicker hasSortButton={false} />
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}
