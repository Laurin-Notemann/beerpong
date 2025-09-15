import dayjs from 'dayjs';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, View } from 'react-native';
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
import { LeaderboardEmptyComponent } from '@/components/Leaderboard/EmptyComponent';
import { LeaderboardScopePicker } from '@/components/Leaderboard/LeaderboardScopePicker';
import { LeaderBoardSeasonInfo } from '@/components/Leaderboard/LeaderboardSeasonInfo';
import PillButton from '@/components/PillButton';
import { RefreshControl } from '@/components/RefreshControl';
import Select from '@/components/Select';
import { Swiper, useSwiper } from '@/components/Swiper';
import Text from '@/components/Text';
import {
    type RankingAlgorithm,
    rankingAlgorithms,
} from '@/constants/rankingAlgorithms';
import { triggerHapticBump } from '@/haptics';
import { formatGroupCode } from '@/utils/groupCode';

const USE_SELECT_FOR_SORT = false;

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

    const [showSortModal, setShowSortModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);

    const groupRankingAlgorithm =
        group.data?.activeSeason?.seasonSettings?.rankingAlgorithm ?? 'ELO';

    const localSearchParams = useLocalSearchParams<{
        sortBy?: RankingAlgorithm;
    }>();

    const sortByParam = localSearchParams.sortBy;

    const [sortingAlgorithm, setSortingAlgorithm] = useState<RankingAlgorithm>(
        sortByParam ?? groupRankingAlgorithm
    );

    useEffect(() => {
        if (sortByParam) {
            setSortingAlgorithm(sortByParam as RankingAlgorithm);
        } else {
            setSortingAlgorithm(groupRankingAlgorithm);
        }
    }, [groupRankingAlgorithm, sortByParam]);

    const { invalidatePlayers } = useQueryInvalidation();

    const refresh = usePullToRefresh(() =>
        invalidatePlayers(groupId!, seasonId!)
    );

    const insets = useInsets(true, true);

    const swiper = useSwiper({
        initialPage: 1,
    });

    const seasonsQuery = useAllSeasonsQuery(groupId);

    const pastSeasons =
        seasonsQuery.data?.data
            ?.filter((i) => i.endDate != null)
            // @ts-expect-error TODO: type this properly
            ?.filter((i) => i.numMatches > 0) ?? [];

    const groupHasPastSeasons = pastSeasons.length > 0;

    const sortOptions = Object.entries(rankingAlgorithms)
        .filter((i) => i[1].showInSelect)
        .map(([id, i]) => {
            return {
                value: id,
                title:
                    i.name +
                    (groupRankingAlgorithm === id ? ' (Group Default)' : ''),
                buttonTitle: i.shortName,
            };
        });

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
                    USE_SELECT_FOR_SORT
                        ? undefined
                        : sortOptions.map((i) => ({
                              title: i.title,
                              onPress: () => {
                                  setSortingAlgorithm(
                                      i.value as RankingAlgorithm
                                  );
                                  setShowSortModal(false);
                              },
                          }))
                }
                content={
                    USE_SELECT_FOR_SORT ? (
                        <Select
                            color="light"
                            value={sortingAlgorithm}
                            style={{
                                marginHorizontal: 16,
                            }}
                            onChange={(id) => {
                                setSortingAlgorithm(id as any);
                                setShowSortModal(false);
                            }}
                            items={sortOptions}
                        />
                    ) : undefined
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
            <Swiper {...swiper} key={groupId + ':' + seasonId}>
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
                        {...dailyLeaderboard}
                        isCurrentSeason
                    />
                    <View
                        style={{
                            flexDirection: 'row',
                            gap: 8,
                            marginTop: 16,
                        }}
                    >
                        <PillButton
                            label={`Sorted by ${sortOptions.find((i) => i.value === sortingAlgorithm)?.buttonTitle}`}
                            iconName="swap-vertical"
                            onPress={() => setShowSortModal(true)}
                            onRemove={
                                sortingAlgorithm === groupRankingAlgorithm
                                    ? undefined
                                    : () => {
                                          setSortingAlgorithm(
                                              groupRankingAlgorithm
                                          );
                                          triggerHapticBump('toast:success');
                                      }
                            }
                        />
                        <PillButton
                            label="Invite"
                            iconName="share-outline"
                            onPress={() => setShowInviteModal(true)}
                        />
                    </View>
                    <Leaderboard
                        rankingAlgorithm={sortingAlgorithm}
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
                        paddingBottom: insets.bottom + (swiperAtTop ? 0 : 48),
                    }}
                    refreshControl={<RefreshControl {...refresh} />}
                >
                    <LeaderBoardSeasonInfo
                        {...currentSeasonLeaderboard}
                        isCurrentSeason
                    />
                    <View
                        style={{
                            flexDirection: 'row',
                            gap: 8,
                            marginTop: 16,
                        }}
                    >
                        <PillButton
                            label={`Sorted by ${sortOptions.find((i) => i.value === sortingAlgorithm)?.buttonTitle}`}
                            iconName="swap-vertical"
                            onPress={() => setShowSortModal(true)}
                            onRemove={
                                sortingAlgorithm === groupRankingAlgorithm
                                    ? undefined
                                    : () =>
                                          setSortingAlgorithm(
                                              groupRankingAlgorithm
                                          )
                            }
                        />
                        <PillButton
                            label="Invite"
                            iconName="share-outline"
                            onPress={() => setShowInviteModal(true)}
                        />
                    </View>
                    <Leaderboard
                        rankingAlgorithm={sortingAlgorithm}
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
                        <View
                            style={{
                                flexDirection: 'row',
                                gap: 8,
                                marginTop: 16,
                            }}
                        >
                            <PillButton
                                label={`Sorted by ${sortOptions.find((i) => i.value === sortingAlgorithm)?.buttonTitle}`}
                                iconName="swap-vertical"
                                onPress={() => setShowSortModal(true)}
                                onRemove={
                                    sortingAlgorithm === groupRankingAlgorithm
                                        ? undefined
                                        : () =>
                                              setSortingAlgorithm(
                                                  groupRankingAlgorithm
                                              )
                                }
                            />
                            <PillButton
                                label="Invite"
                                iconName="share-outline"
                                onPress={() => setShowInviteModal(true)}
                            />
                        </View>
                        <Leaderboard
                            rankingAlgorithm={sortingAlgorithm}
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
                <LeaderboardScopePicker
                    key={groupId + ':' + seasonId} // rerender when switching groups so we remember which scope we're on
                    swiperProgress={swiper.swiperProgress}
                    options={[
                        { id: 'today', label: 'Today' },
                        { id: 'season', label: 'This Season' },
                        groupHasPastSeasons && {
                            id: 'all-time',
                            label: 'All Time',
                        },
                    ]}
                    onChange={(scope) => {
                        const optionIndex = [
                            'today',
                            'season',
                            'all-time',
                        ].indexOf(scope);

                        swiper.ref?.current?.scrollTo({
                            index: optionIndex,
                            animated: true,
                        });
                    }}
                />
            </SafeAreaView>
            {/* </SafeAreaView> */}
        </GestureHandlerRootView>
    );
}
