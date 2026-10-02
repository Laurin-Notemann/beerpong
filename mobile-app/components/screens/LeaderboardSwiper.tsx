import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import type { ScrollViewProps } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { useAllSeasonsQuery, useGroup } from '@/api/calls/seasonHooks';
import { env } from '@/api/env';
import { useLeaderboardProps } from '@/api/propHooks/leaderboardPropHooks';
import { usePullToRefresh, useQueryInvalidation } from '@/api/utils/reactQuery';
import { useNavigation } from '@/app/navigation/useNavigation';
import { useInsets } from '@/app/useInsets';
import ErrorScreen from '@/components/ErrorScreen';
import Leaderboard from '@/components/Leaderboard';
import { LeaderboardEmptyComponent } from '@/components/Leaderboard/EmptyComponent';
import { LeaderBoardSeasonInfo } from '@/components/Leaderboard/LeaderboardSeasonInfo';
import { LeaderboardCountdown } from '@/components/LeaderboardCountdown';
import LoadingScreen from '@/components/LoadingScreen';
import { RefreshControl } from '@/components/RefreshControl';
import { Swiper, useControlledSwiper } from '@/components/Swiper';
import Text from '@/components/Text';
import { SeasonSettingsDto } from '@/openapi/openapi';
import { formatWakeTime, parseWakeTime } from '@/utils/wakeTime';
import { useScopePicker } from '@/zustand/useScopePicker';

dayjs.extend(duration);

const swiperAtTop = false;

export function LayoutScrollView({
    children,
    style,
    contentContainerStyle,
    ...props
}: ScrollViewProps) {
    const insets = useInsets(true);
    return (
        <ScrollView
            style={[{ flex: 1 }, style]}
            contentContainerStyle={[
                {
                    alignItems: 'center',

                    paddingTop: insets.top + (swiperAtTop ? 48 : 0),
                    paddingBottom: insets.bottom + (swiperAtTop ? 0 : 48),
                },
                contentContainerStyle,
            ]}
            {...props}
        >
            {children}
        </ScrollView>
    );
}

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

    const isLoading = !group || seasonsQuery.isLoading;

    const dailyLeaderboardIsEmpty =
        dailyPlayers.filter((i) => i.matches > 0).length === 0;

    const hasDailyLeaderboardCountdown =
        activeSeason?.seasonSettings?.dailyLeaderboard === 'WAKE_TIME' &&
        !dailyLeaderboardIsEmpty;

    const wakeTime = parseWakeTime(activeSeason?.seasonSettings?.wakeTime);

    const dailyLeaderboardResetDate = dayjs()
        .hour(wakeTime.hour)
        .minute(wakeTime.minute)
        .second(0)
        .add(1, 'day');

    if (isLoading) return <LoadingScreen />;
    if (seasonsQuery.isError) return <ErrorScreen error={seasonsQuery.error} />;

    const spacing = { marginTop: 32, marginBottom: 67 };

    return (
        <Swiper {...swiper}>
            <LayoutScrollView refreshControl={<RefreshControl {...refresh} />}>
                <LeaderBoardSeasonInfo {...dailyLeaderboard} isCurrentSeason />
                {hasDailyLeaderboardCountdown && (
                    <LeaderboardCountdown
                        type="today"
                        endDate={dailyLeaderboardResetDate}
                    />
                )}
                <Leaderboard
                    rankingAlgorithm={rankingAlgorithm}
                    ListEmptyComponent={
                        <LeaderboardEmptyComponent message="No players qualified yet today." />
                    }
                    players={dailyPlayers}
                    onPlayerPress={onPlayerPress}
                    minMatchesRequiredToBeRanked={minMatchesRequiredToBeRanked}
                />
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
            </LayoutScrollView>
            <LayoutScrollView refreshControl={<RefreshControl {...refresh} />}>
                <LeaderBoardSeasonInfo
                    {...currentSeasonLeaderboard}
                    isCurrentSeason
                />
                <Leaderboard
                    rankingAlgorithm={rankingAlgorithm}
                    ListEmptyComponent={
                        <LeaderboardEmptyComponent message="No players qualified this season." />
                    }
                    players={currentSeasonPlayers}
                    onPlayerPress={onPlayerPress}
                    minMatchesRequiredToBeRanked={minMatchesRequiredToBeRanked}
                />
                <Text color="secondary" variant="fineprint" style={spacing}>
                    {activeSeason?.startDate
                        ? `Season started ${env.format.date.seasonStartAndEnd(
                              dayjs(activeSeason.startDate)
                          )}`
                        : null}
                </Text>
            </LayoutScrollView>
            {groupHasPastSeasons && (
                <LayoutScrollView
                    refreshControl={<RefreshControl {...refresh} />}
                >
                    <LeaderBoardSeasonInfo
                        {...alltimeLeaderboard}
                        isCurrentSeason
                    />
                    <Leaderboard
                        rankingAlgorithm={rankingAlgorithm}
                        ListEmptyComponent={
                            <LeaderboardEmptyComponent message="No players qualified in this group." />
                        }
                        players={alltimePlayers}
                        onPlayerPress={onPlayerPress}
                        minMatchesRequiredToBeRanked={
                            minMatchesRequiredToBeRanked
                        }
                    />
                    <Text color="secondary" variant="fineprint" style={spacing}>
                        {activeSeason?.startDate
                            ? `Group created ${env.format.date.seasonStartAndEnd(
                                  dayjs(pastSeasons[0].startDate)
                              )}`
                            : null}
                    </Text>
                </LayoutScrollView>
            )}
        </Swiper>
    );
}

const getDayStartedAt = (settings: SeasonSettingsDto | undefined) => {
    if (!settings) return 'Daily leaderboard.';

    return settings?.dailyLeaderboard === 'LAST_24_HOURS'
        ? `Day started yesterday at ${dayjs().subtract(24, 'hours').format('H:mm')}.`
        : `Day started at ${formatWakeTime(settings?.wakeTime)}.`;
};
