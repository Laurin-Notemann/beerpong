import { useMemo } from 'react';

import { useAllSeasonsQuery, useGroup } from '@/api/calls/seasonHooks';
import { useMatchlistProps } from '@/api/propHooks/matchlistPropHooks';
import { matchDtoToMatch } from '@/api/utils/matchDtoToMatch';
import { NoMatchesPlayedYet } from '@/components/emptyStates/NoMatchesPlayedYet';
import ErrorScreen from '@/components/ErrorScreen';
import LoadingScreen from '@/components/LoadingScreen';
import MatchesList from '@/components/MatchesList';
import { Swiper, useControlledSwiper } from '@/components/Swiper';
import { useInsets } from '@/lib/useInsets';
import { getWakeTimeDayStart } from '@/utils/wakeTime';
import { useScopePicker } from '@/zustand/useScopePicker';

export function MatchesSwiper() {
    const { props, isLoading, error } = useMatchlistProps();

    const insets = useInsets(true, true);

    const { groupId, seasonId, activeSeason } = useGroup();
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

    const wakeTime = activeSeason?.seasonSettings?.wakeTime;
    const seasonMatches = props?.matches;

    const todayMatches = useMemo(() => {
        const todayStart = getWakeTimeDayStart(new Date(), wakeTime).getTime();
        return (seasonMatches ?? []).filter(
            (m) =>
                getWakeTimeDayStart(new Date(m.date), wakeTime).getTime() ===
                todayStart
        );
    }, [seasonMatches, wakeTime]);

    const seasons = seasonsQuery.data?.data;
    // past seasons from the season list, the current season from the live matches query
    const allTimeMatches = useMemo(
        () => [
            ...(seasonMatches ?? []),
            ...(seasons ?? [])
                .filter((s) => s.id !== seasonId)
                .flatMap((s) =>
                    s.ruleMoves && s.rawPlayers
                        ? s.matches.map(
                              matchDtoToMatch(s.rawPlayers, s.ruleMoves)
                          )
                        : []
                ),
        ],
        [seasons, seasonMatches, seasonId]
    );

    if (isLoading) return <LoadingScreen />;
    if (!props)
        return error ? <ErrorScreen error={error} /> : <LoadingScreen />;

    return (
        <Swiper {...leaderboardSwiper} lazyWindow={1}>
            <MatchesList
                contentContainerStyle={{
                    paddingTop: insets.top,
                    paddingBottom: insets.bottom + 64,
                }}
                {...props}
                matches={todayMatches}
                ListEmptyComponent={
                    <NoMatchesPlayedYet message="No matches played yet today." />
                }
            />
            <MatchesList
                contentContainerStyle={{
                    paddingTop: insets.top,
                    paddingBottom: insets.bottom + 64,
                }}
                {...props}
                ListEmptyComponent={
                    <NoMatchesPlayedYet message="No matches played yet this season." />
                }
            />
            {groupHasPastSeasons && (
                <MatchesList
                    contentContainerStyle={{
                        paddingTop: insets.top,
                        paddingBottom: insets.bottom + 64,
                    }}
                    {...props}
                    matches={allTimeMatches}
                    ListEmptyComponent={
                        <NoMatchesPlayedYet message="No matches played yet in this group." />
                    }
                />
            )}
        </Swiper>
    );
}
