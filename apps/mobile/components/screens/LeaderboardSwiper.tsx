import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { View } from 'react-native';

import { useAllSeasonsQuery, useGroup } from '@/api/calls/seasonHooks';
import { env } from '@/api/env';
import { useLeaderboardProps } from '@/api/propHooks/leaderboardPropHooks';
import { usePullToRefresh, useQueryInvalidation } from '@/api/utils/reactQuery';
import Leaderboard from '@/components/Leaderboard';
import { LeaderboardEmptyComponent } from '@/components/Leaderboard/EmptyComponent';
import { LeaderBoardSeasonInfo } from '@/components/Leaderboard/LeaderboardSeasonInfo';
import { LeaderboardCountdown } from '@/components/LeaderboardCountdown';
import LoadingScreen from '@/components/LoadingScreen';
import { RefreshControl } from '@/components/RefreshControl';
import { Swiper, useControlledSwiper } from '@/components/Swiper';
import Text from '@/components/Text';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { useInsets } from '@/lib/useInsets';
import { SeasonSettingsDto } from '@/openapi/openapi';
import { formatWakeTime } from '@/utils/wakeTime';
import { useScopePicker } from '@/zustand/useScopePicker';

dayjs.extend(duration);

export function LeaderboardSwiper() {
    const scopePicker = useScopePicker();

    const { groupId, seasonId, group, activeSeason } = useGroup();

    const {
        currentSeasonPlayers,
        alltimePlayers,
        dailyPlayers,
        dailyLeaderboard,
        currentSeasonLeaderboard,
        alltimeLeaderboard,
    } = useLeaderboardProps(groupId, seasonId ?? null);

    const swiper = useControlledSwiper(scopePicker.leaderboardSwiperProgress);

    const { invalidatePlayers } = useQueryInvalidation();

    const refresh = usePullToRefresh(() =>
        invalidatePlayers(groupId!, seasonId!)
    );

    const seasonsQuery = useAllSeasonsQuery(groupId);

    const nav = useNavigation();

    const insets = useInsets(true);

    const pastSeasons =
        seasonsQuery.data?.data
            ?.filter((i) => i.endDate != null)
            ?.filter((i) => i.numMatches > 0) ?? [];

    const groupHasPastSeasons = pastSeasons.length > 0;

    const rankingAlgorithm =
        scopePicker.rankingAlgorithm ??
        activeSeason?.seasonSettings?.rankingAlgorithm ??
        'ELO';

    function onPlayerPress(id: string) {
        nav.navigate('player', { id });
    }

    const minMatchesRequiredToBeRanked =
        activeSeason?.seasonSettings?.minMatchesToQualify ?? 0;

    // the season list only adds the All Time page; the current season shows without it
    const isLoading = !group;

    const dailyLeaderboardIsEmpty =
        dailyPlayers.filter((i) => i.matches > 0).length === 0;

    const hasDailyLeaderboardCountdown =
        activeSeason?.seasonSettings?.dailyLeaderboard === 'WAKE_TIME' &&
        !dailyLeaderboardIsEmpty;

    if (isLoading) return <LoadingScreen />;

    const spacing = { marginTop: 32, marginBottom: 67 };

    const listProps = {
        refreshControl: <RefreshControl {...refresh} />,
        contentContainerStyle: {
            paddingTop: insets.top,
            paddingBottom: insets.bottom + 48,
        },
        rankingAlgorithm,
        onPlayerPress,
        minMatchesRequiredToBeRanked,
    };

    return (
        <Swiper {...swiper} lazyWindow={1}>
            <Leaderboard
                {...listProps}
                ListHeaderComponent={
                    <>
                        <LeaderBoardSeasonInfo
                            {...dailyLeaderboard}
                            isCurrentSeason
                        />
                        {hasDailyLeaderboardCountdown && (
                            <LeaderboardCountdown
                                wakeTime={
                                    activeSeason?.seasonSettings?.wakeTime
                                }
                            />
                        )}
                    </>
                }
                podiumEmptyComponent={
                    <LeaderboardEmptyComponent message="No players qualified yet today." />
                }
                players={dailyPlayers}
                ListFooterComponent={
                    <View style={{ alignItems: 'center' }}>
                        <Text
                            color="secondary"
                            variant="fineprint"
                            style={spacing}
                            onPress={() => {
                                nav.navigate('dailyLeaderboardSettings');
                            }}
                        >
                            {getDayStartedAt(activeSeason?.seasonSettings)}{' '}
                            <Text color="link" style={{ fontSize: 13 }}>
                                Learn more
                            </Text>
                        </Text>
                    </View>
                }
            />
            <Leaderboard
                {...listProps}
                ListHeaderComponent={
                    <LeaderBoardSeasonInfo
                        {...currentSeasonLeaderboard}
                        isCurrentSeason
                    />
                }
                podiumEmptyComponent={
                    <LeaderboardEmptyComponent message="No players qualified this season." />
                }
                players={currentSeasonPlayers}
                ListFooterComponent={
                    <View style={{ alignItems: 'center' }}>
                        <Text
                            color="secondary"
                            variant="fineprint"
                            style={spacing}
                        >
                            {activeSeason?.startDate
                                ? `Season started ${env.format.date.seasonStartAndEnd(
                                      dayjs(activeSeason.startDate)
                                  )}`
                                : null}
                        </Text>
                    </View>
                }
            />
            {groupHasPastSeasons && (
                <Leaderboard
                    {...listProps}
                    ListHeaderComponent={
                        <LeaderBoardSeasonInfo
                            {...alltimeLeaderboard}
                            isCurrentSeason
                        />
                    }
                    podiumEmptyComponent={
                        <LeaderboardEmptyComponent message="No players qualified in this group." />
                    }
                    players={alltimePlayers}
                    ListFooterComponent={
                        <View style={{ alignItems: 'center' }}>
                            <Text
                                color="secondary"
                                variant="fineprint"
                                style={spacing}
                            >
                                {activeSeason?.startDate
                                    ? `Group created ${env.format.date.seasonStartAndEnd(
                                          dayjs(pastSeasons[0].startDate)
                                      )}`
                                    : null}
                            </Text>
                        </View>
                    }
                />
            )}
        </Swiper>
    );
}

const getDayStartedAt = (settings: SeasonSettingsDto | null | undefined) => {
    if (!settings) return 'Daily leaderboard.';

    return settings?.dailyLeaderboard === 'LAST_24_HOURS'
        ? `Day started yesterday at ${dayjs().subtract(24, 'hours').format('H:mm')}.`
        : `Day started at ${formatWakeTime(settings?.wakeTime)}.`;
};
