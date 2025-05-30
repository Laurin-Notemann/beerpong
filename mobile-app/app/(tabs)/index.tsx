import dayjs from 'dayjs';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
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
import { useInsets } from '@/app/useInsets';
import ConfirmationModal from '@/components/ConfirmationModal';
import copyToClipboard from '@/components/copyToClipboard';
import Leaderboard from '@/components/Leaderboard';
import { LeaderboardScopePicker } from '@/components/Leaderboard/LeaderboardScopePicker';
import { LeaderBoardSeasonInfo } from '@/components/Leaderboard/LeaderboardSeasonInfo';
import PillButton from '@/components/PillButton';
import { RefreshControl } from '@/components/RefreshControl';
import { Swiper, useSwiper } from '@/components/Swiper';
import { useTheme } from '@/theme';
import { formatGroupCode } from '@/utils/groupCode';
import { useLocalSettings } from '@/zustand/localSettingsStore';

const swiperAtTop = false;

export default function Page() {
    const nav = useNavigation();
    const { groupId, seasonId, group } = useGroup();

    const { players } = useLeaderboardProps(groupId, seasonId ?? null);

    const [showSortModal, setShowSortModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);

    const [sortingAlgorithm, setSortingAlgorithm] = useState<'ELO' | 'AVERAGE'>(
        'ELO'
    );

    const { invalidatePlayers } = useQueryInvalidation();

    const refresh = usePullToRefresh(() =>
        invalidatePlayers(groupId!, seasonId!)
    );

    const experiments = useLocalSettings();

    const insets = useInsets(true, true);

    const theme = useTheme();

    const swiper = useSwiper();

    const seasonsQuery = useAllSeasonsQuery(groupId);

    const pastSeasons =
        seasonsQuery.data?.data
            ?.filter((i) => i.endDate != null)
            // @ts-ignore TODO: type this properly
            ?.filter((i) => i.numMatches > 0) ?? [];

    const groupHasPastSeasons = pastSeasons.length > 0;

    function CurrentSeasonLeaderboard() {
        return (
            <ScrollView
                style={{
                    flex: 1,
                }}
                contentContainerStyle={{
                    alignItems: 'center',

                    paddingTop: insets.top + (swiperAtTop ? 48 : 0),
                    paddingBottom: insets.bottom + (swiperAtTop ? 0 : 48),
                }}
                refreshControl={<RefreshControl {...refresh} />}
            >
                <LeaderBoardSeasonInfo
                    numPlayers={group.data?.numberOfPlayers ?? 0}
                    numMatches={group.data?.numberOfMatches ?? 0}
                    startDate={group.data?.activeSeason?.startDate!}
                    isCurrentSeason
                />
                {experiments.eloAlgorithm && (
                    <View
                        style={{
                            flexDirection: 'row',
                            gap: 8,
                            marginTop: 16,
                        }}
                    >
                        <PillButton
                            label="Sort"
                            iconName="swap-vertical"
                            onPress={() => setShowSortModal(true)}
                        />
                        <PillButton
                            label="Invite"
                            iconName="share-outline"
                            onPress={() => setShowInviteModal(true)}
                        />
                    </View>
                )}
                <Leaderboard
                    players={players}
                    onPlayerPress={(id) => nav.navigate('player', { id })}
                    minMatchesRequiredToBeRanked={
                        group.data?.activeSeason?.seasonSettings
                            ?.minMatchesToQualify ?? 1
                    }
                />
                <Text
                    style={{
                        fontSize: 12,
                        color: theme.color.text.secondary,
                        marginTop: 32,
                        marginBottom: 32,
                    }}
                >
                    {group.data?.activeSeason?.startDate
                        ? `Leaderboard started ${env.format.date.seasonStartAndEnd(
                              dayjs(group.data.activeSeason.startDate)
                          )}`
                        : null}
                </Text>
            </ScrollView>
        );
    }

    function DailyLeaderboard() {
        return (
            <ScrollView
                style={{
                    flex: 1,
                }}
                contentContainerStyle={{
                    alignItems: 'center',

                    paddingTop: insets.top,
                    paddingBottom: insets.bottom,
                }}
                refreshControl={<RefreshControl {...refresh} />}
            >
                <View
                    style={{
                        alignItems: 'center',

                        borderRadius: 10,
                        backgroundColor: theme.panel.light.bg,
                        padding: 8,
                        marginHorizontal: 16,
                    }}
                >
                    <LeaderBoardSeasonInfo
                        numPlayers={group.data?.numberOfPlayers ?? 0}
                        numMatches={group.data?.numberOfMatches ?? 0}
                        startDate={group.data?.activeSeason?.startDate!}
                        isCurrentSeason
                    />
                    {experiments.eloAlgorithm && (
                        <View
                            style={{
                                flexDirection: 'row',
                                gap: 8,
                                marginTop: 16,
                            }}
                        >
                            <PillButton
                                label="Sort"
                                iconName="swap-vertical"
                                onPress={() => setShowSortModal(true)}
                            />
                            <PillButton
                                label="Invite"
                                iconName="share-outline"
                                onPress={() => setShowInviteModal(true)}
                            />
                        </View>
                    )}
                    <Leaderboard
                        players={players}
                        onPlayerPress={(id) => nav.navigate('player', { id })}
                        minMatchesRequiredToBeRanked={
                            group.data?.activeSeason?.seasonSettings
                                ?.minMatchesToQualify ?? 1
                        }
                    />
                    <Text
                        style={{
                            fontSize: 12,
                            color: theme.color.text.secondary,
                            marginTop: 32,
                            marginBottom: 32,
                        }}
                    >
                        {group.data?.activeSeason?.startDate
                            ? `Leaderboard started ${env.format.date.seasonStartAndEnd(
                                  dayjs(group.data.activeSeason.startDate)
                              )}`
                            : null}
                    </Text>
                </View>
            </ScrollView>
        );
    }

    function AllTimeLeaderboard() {
        return (
            <ScrollView
                style={{
                    flex: 1,
                }}
                contentContainerStyle={{
                    alignItems: 'center',

                    paddingTop: insets.top,
                    paddingBottom: insets.bottom,
                }}
                refreshControl={<RefreshControl {...refresh} />}
            >
                <LeaderBoardSeasonInfo
                    numPlayers={group.data?.numberOfPlayers ?? 0}
                    numMatches={group.data?.numberOfMatches ?? 0}
                    startDate={group.data?.activeSeason?.startDate!}
                    isCurrentSeason
                />
                {experiments.eloAlgorithm && (
                    <View
                        style={{
                            flexDirection: 'row',
                            gap: 8,
                            marginTop: 16,
                        }}
                    >
                        <PillButton
                            label="Sort"
                            iconName="swap-vertical"
                            onPress={() => setShowSortModal(true)}
                        />
                        <PillButton
                            label="Invite"
                            iconName="share-outline"
                            onPress={() => setShowInviteModal(true)}
                        />
                    </View>
                )}
                <Leaderboard
                    players={players}
                    onPlayerPress={(id) => nav.navigate('player', { id })}
                    minMatchesRequiredToBeRanked={
                        group.data?.activeSeason?.seasonSettings
                            ?.minMatchesToQualify ?? 1
                    }
                />
                <Text
                    style={{
                        fontSize: 12,
                        color: theme.color.text.secondary,
                        marginTop: 32,
                        marginBottom: 32,
                    }}
                >
                    {group.data?.activeSeason?.startDate
                        ? `Leaderboard started ${env.format.date.seasonStartAndEnd(
                              dayjs(group.data.activeSeason.startDate)
                          )}`
                        : null}
                </Text>
            </ScrollView>
        );
    }

    return (
        <GestureHandlerRootView>
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
                onClose={() => setShowSortModal(false)}
                title="Sort Players By"
                actions={
                    [
                        {
                            title: 'Elo (Group Default)',

                            onPress: () => {
                                setSortingAlgorithm('ELO');
                                setShowSortModal(false);
                            },
                        },
                        {
                            title: 'Average Points Scored',

                            onPress: () => {
                                setSortingAlgorithm('AVERAGE');
                                setShowSortModal(false);
                            },
                        },
                    ] as const
                }
                isVisible={showSortModal}
            />
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
            <Swiper {...swiper}>
                <CurrentSeasonLeaderboard />
                {experiments.dailyLeaderboard && <DailyLeaderboard />}
                {experiments.dailyLeaderboard && groupHasPastSeasons && (
                    <AllTimeLeaderboard />
                )}
            </Swiper>
            {experiments.dailyLeaderboard && (
                <View
                    style={{
                        position: 'absolute',

                        top: swiperAtTop ? insets.top + 4 : undefined,
                        bottom: swiperAtTop ? undefined : insets.bottom + 4,

                        width: '100%',
                    }}
                >
                    <LeaderboardScopePicker
                        swiperProgress={swiper.swiperProgress}
                        options={[
                            { id: 'today', label: 'Today' },
                            { id: 'season', label: 'This Season' },
                        ].concat(
                            groupHasPastSeasons
                                ? [{ id: 'all-time', label: 'All Time' }]
                                : []
                        )}
                        onChange={(scope) => {
                            swiper.ref?.current?.scrollTo({
                                index: ['today', 'season', 'all-time'].indexOf(
                                    scope
                                ),
                                animated: true,
                            });
                        }}
                    />
                </View>
            )}
        </GestureHandlerRootView>
    );
}
