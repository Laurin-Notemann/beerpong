import dayjs from 'dayjs';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native';
import {
    GestureHandlerRootView,
    ScrollView,
} from 'react-native-gesture-handler';

import { useAllSeasonsQuery, useGroup } from '@/api/calls/seasonHooks';
import { env } from '@/api/env';
import { useLeaderboardProps } from '@/api/propHooks/leaderboardPropHooks';
import { usePullToRefresh, useQueryInvalidation } from '@/api/utils/reactQuery';
import { AppBackground } from '@/app/Background';
import { useNavigation } from '@/app/navigation/useNavigation';
import { PastSeasonsSwiper } from '@/app/pastSeasons';
import { useInsets } from '@/app/useInsets';
import ConfirmationModal from '@/components/ConfirmationModal';
import copyToClipboard from '@/components/copyToClipboard';
import { HeaderTitle } from '@/components/HeaderItem';
import Leaderboard from '@/components/Leaderboard';
import { LeaderboardEmptyComponent } from '@/components/Leaderboard/EmptyComponent';
import { LeaderboardScopePicker } from '@/components/Leaderboard/LeaderboardScopePicker';
import { LeaderBoardSeasonInfo } from '@/components/Leaderboard/LeaderboardSeasonInfo';
import PillButton from '@/components/PillButton';
import { RefreshControl } from '@/components/RefreshControl';
import { Swiper, useControlledSwiper } from '@/components/Swiper';
import Text from '@/components/Text';
import { formatGroupCode } from '@/utils/groupCode';
import { useScopePicker } from '@/zustand/scopePickerStore';

const swiperAtTop = false;

export default function Page() {
    const nav = useNavigation();
    const { groupId, seasonId, group } = useGroup();

    const {
        currentSeasonPlayers,
        alltimePlayers,
        dailyPlayers,
        dailyLeaderboard,
        currentSeasonLeaderboard,
        alltimeLeaderboard,
    } = useLeaderboardProps(groupId, seasonId ?? null);

    const [showInviteModal, setShowInviteModal] = useState(false);

    const groupRankingAlgorithm =
        group.data?.activeSeason?.seasonSettings?.rankingAlgorithm ?? 'ELO';

    const scopePicker = useScopePicker();

    const leaderboardSwiper = useControlledSwiper(
        scopePicker.leaderboardSwiperProgress
    );
    const pastSeasonsSwiper = useControlledSwiper(
        scopePicker.pastSeasonsSwiperProgress
    );

    // keep shared progress in sync with persisted page index
    React.useEffect(() => {
        leaderboardSwiper.swiperProgress.value =
            scopePicker.leaderboardPageIndex ?? 0;
    }, [scopePicker.leaderboardPageIndex]);
    React.useEffect(() => {
        pastSeasonsSwiper.swiperProgress.value =
            scopePicker.pastSeasonsPageIndex ?? 0;
    }, [scopePicker.pastSeasonsPageIndex]);

    const { invalidatePlayers } = useQueryInvalidation();

    const refresh = usePullToRefresh(() =>
        invalidatePlayers(groupId!, seasonId!)
    );

    const insets = useInsets(true, true);

    const seasonsQuery = useAllSeasonsQuery(groupId);

    const pastSeasons =
        seasonsQuery.data?.data
            ?.filter((i) => i.endDate != null)
            ?.filter((i) => i.numMatches > 0) ?? [];

    const groupHasPastSeasons = pastSeasons.length > 0;

    return (
        <GestureHandlerRootView>
            <Stack.Screen
                options={{
                    headerTitle: scopePicker.isPastSeasonsMode
                        ? () => <HeaderTitle title="Past Seasons" />
                        : () => (
                              <HeaderTitle
                                  title={group.data?.name || 'Unknown'}
                              />
                          ),

                    headerRight: () => (
                        <PillButton
                            label="Invite"
                            iconName="share-outline"
                            onPress={() => setShowInviteModal(true)}
                        />
                    ),
                }}
            />
            {/* <Stack.Screen
                options={{
                    headerTitle: () => (
                        <SwipeButtons
                            animationProgress={swiper.swiperProgress}
                            slot1={<HeaderTitle title="This Season" />}
                            slot2={<HeaderTitle title="Today" />}
                        />
                    ),
                }}
            /> */}
            <AppBackground />

            <ConfirmationModal
                onClose={() => setShowInviteModal(false)}
                title="Invite Friends to this Group"
                actions={
                    [
                        {
                            title: 'Copy Group Code',

                            onPress: () => {
                                if (group.data?.inviteCode) {
                                    // this should always be true
                                    copyToClipboard(
                                        formatGroupCode(group.data.inviteCode)
                                    );
                                    setShowInviteModal(false);
                                }
                            },
                        },
                    ] as const
                }
                isVisible={showInviteModal}
            />
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
                    <ScrollView
                        style={{
                            flex: 1,
                        }}
                        contentContainerStyle={{
                            alignItems: 'center',

                            paddingTop: insets.top + (swiperAtTop ? 48 : 0),
                            paddingBottom:
                                insets.bottom + (swiperAtTop ? 0 : 48),
                        }}
                        refreshControl={<RefreshControl {...refresh} />}
                    >
                        <LeaderBoardSeasonInfo
                            {...dailyLeaderboard}
                            isCurrentSeason
                        />
                        <Leaderboard
                            rankingAlgorithm={
                                scopePicker.rankingAlgorithm ??
                                groupRankingAlgorithm
                            }
                            ListEmptyComponent={
                                <LeaderboardEmptyComponent message="No matches played yet today." />
                            }
                            players={dailyPlayers}
                            onPlayerPress={(id) =>
                                nav.navigate('player', { id, scope: 'today' })
                            }
                            minMatchesRequiredToBeRanked={
                                group.data?.activeSeason?.seasonSettings
                                    ?.minMatchesToQualify ?? 1
                            }
                        />
                        <Text
                            color="secondary"
                            style={{
                                fontSize: 12,
                                marginTop: 32,
                                marginBottom: 32,
                            }}
                            onPress={() => {
                                nav.navigate('dailyLeaderboardSettings');
                            }}
                        >
                            {group.data?.activeSeason!.seasonSettings!
                                .dailyLeaderboard === 'LAST_24_HOURS'
                                ? `Day started yesterday at ${dayjs().subtract(24, 'hours').format('H:mm')}.`
                                : `Day started at ${group.data?.activeSeason!.seasonSettings!.wakeTimeHour! + ':00'}.`}{' '}
                            <Text color="link" style={{ fontSize: 13 }}>
                                Learn more
                            </Text>
                        </Text>
                    </ScrollView>
                    <ScrollView
                        style={{
                            flex: 1,
                        }}
                        contentContainerStyle={{
                            alignItems: 'center',

                            paddingTop: insets.top + (swiperAtTop ? 48 : 0),
                            paddingBottom:
                                insets.bottom + (swiperAtTop ? 0 : 48),
                        }}
                        refreshControl={<RefreshControl {...refresh} />}
                    >
                        <LeaderBoardSeasonInfo
                            {...currentSeasonLeaderboard}
                            isCurrentSeason
                        />
                        <Leaderboard
                            rankingAlgorithm={
                                scopePicker.rankingAlgorithm ??
                                groupRankingAlgorithm
                            }
                            ListEmptyComponent={
                                <LeaderboardEmptyComponent message="No matches played yet this season." />
                            }
                            players={currentSeasonPlayers}
                            onPlayerPress={(id) =>
                                nav.navigate('player', { id, scope: seasonId! })
                            }
                            minMatchesRequiredToBeRanked={
                                group.data?.activeSeason?.seasonSettings
                                    ?.minMatchesToQualify ?? 1
                            }
                        />
                        <Text
                            color="secondary"
                            style={{
                                fontSize: 12,
                                marginTop: 32,
                                marginBottom: 32,
                            }}
                        >
                            {group.data?.activeSeason?.startDate
                                ? `Season started ${env.format.date.seasonStartAndEnd(
                                      dayjs(group.data.activeSeason.startDate)
                                  )}`
                                : null}
                        </Text>
                    </ScrollView>
                    {groupHasPastSeasons && (
                        <ScrollView
                            style={{
                                flex: 1,
                            }}
                            contentContainerStyle={{
                                alignItems: 'center',

                                paddingTop: insets.top + (swiperAtTop ? 48 : 0),
                                paddingBottom:
                                    insets.bottom + (swiperAtTop ? 0 : 48),
                            }}
                            refreshControl={<RefreshControl {...refresh} />}
                        >
                            <LeaderBoardSeasonInfo
                                {...alltimeLeaderboard}
                                isCurrentSeason
                            />
                            <Leaderboard
                                rankingAlgorithm={
                                    scopePicker.rankingAlgorithm ??
                                    groupRankingAlgorithm
                                }
                                ListEmptyComponent={
                                    <LeaderboardEmptyComponent message="No matches played yet in this group." />
                                }
                                players={alltimePlayers}
                                onPlayerPress={(id) =>
                                    nav.navigate('player', {
                                        id,
                                        scope: 'all-time',
                                    })
                                }
                                minMatchesRequiredToBeRanked={
                                    group.data?.activeSeason?.seasonSettings
                                        ?.minMatchesToQualify ?? 1
                                }
                            />
                            <Text
                                color="secondary"
                                style={{
                                    fontSize: 12,
                                    marginTop: 32,
                                    marginBottom: 32,
                                }}
                            >
                                {group.data?.activeSeason?.startDate
                                    ? `Group created ${env.format.date.seasonStartAndEnd(
                                          dayjs(pastSeasons[0].startDate)
                                      )}`
                                    : null}
                            </Text>
                        </ScrollView>
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
                    rankingAlgorithm={scopePicker.rankingAlgorithm}
                />
            )}
            {/* <SafeAreaView
                style={{
                    backgroundColor: 'red',
                }}
            > */}
            <SafeAreaView
                style={{
                    position: 'absolute',

                    top: swiperAtTop ? insets.top + 4 : undefined,
                    bottom: swiperAtTop ? undefined : insets.bottom + 4,

                    width: '100%',
                }}
            >
                <LeaderboardScopePicker />
            </SafeAreaView>
            {/* </SafeAreaView> */}
        </GestureHandlerRootView>
    );
}
