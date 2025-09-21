import { useAllSeasonsQuery, useGroup } from '@/api/calls/seasonHooks';
import { useMatchlistProps } from '@/api/propHooks/matchlistPropHooks';
import { matchDtoToMatch } from '@/api/utils/matchDtoToMatch';
import { useInsets } from '@/app/useInsets';
import { NoMatchesPlayedYet } from '@/components/emptyStates/NoMatchesPlayedYet';
import ErrorScreen from '@/components/ErrorScreen';
import LoadingScreen from '@/components/LoadingScreen';
import MatchesList from '@/components/MatchesList';
import { Swiper, useControlledSwiper } from '@/components/Swiper';
import { useScopePicker } from '@/zustand/useScopePicker';

export function MatchesSwiper() {
    const { props, isLoading, error } = useMatchlistProps();

    const insets = useInsets(true, true);

    const { groupId, group } = useGroup();
    const scopePicker = useScopePicker();

    const seasonsQuery = useAllSeasonsQuery(groupId);

    const pastSeasons =
        seasonsQuery.data?.data
            ?.filter((i) => i.endDate != null)
            ?.filter((i) => i.numMatches > 0) ?? [];

    const groupHasPastSeasons = pastSeasons.length > 0;

    const leaderboardSwiper = useControlledSwiper(
        scopePicker.leaderboardSwiperProgress,
        'matches'
    );

    const wakeTime =
        group.data?.activeSeason?.seasonSettings?.wakeTimeHour ?? 0;

    if (isLoading) return <LoadingScreen />;
    if (!props) return <ErrorScreen error={error} />;

    const todayMatches = props.matches.filter((m) => {
        const matchDate = new Date(m.date);
        const now = new Date();
        if (now.getHours() < wakeTime) now.setDate(now.getDate() - 1);
        now.setHours(wakeTime, 0, 0, 0);
        if (matchDate.getHours() < wakeTime)
            matchDate.setDate(matchDate.getDate() - 1);
        matchDate.setHours(wakeTime, 0, 0, 0);
        return matchDate.getTime() === now.getTime();
    });

    const allTimeMatches = (seasonsQuery.data?.data ?? []).flatMap(
        (s) =>
            (s.ruleMoves && s.rawPlayers
                ? s.matches.map(matchDtoToMatch(s.rawPlayers, s.ruleMoves))
                : []) as typeof props.matches
    );

    return (
        <Swiper {...leaderboardSwiper}>
            <MatchesList
                contentContainerStyle={{
                    paddingTop: insets.top,
                    paddingBottom: insets.bottom + 48,
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
                    paddingBottom: insets.bottom + 48,
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
                        paddingBottom: insets.bottom + 48,
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
