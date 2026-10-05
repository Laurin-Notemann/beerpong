import { useMemo } from 'react';

import {
    getPastSeasons,
    useAllSeasonsQuery,
    useGroup,
} from '@/api/calls/seasonHooks';
import { useSeasonMatches } from '@/api/calls/seasonMatchesHooks';
import { useMatchlistProps } from '@/api/propHooks/matchlistPropHooks';
import { Match } from '@/api/utils/matchDtoToMatch';
import { NoMatchesPlayedYet } from '@/components/emptyStates/NoMatchesPlayedYet';
import ErrorScreen from '@/components/ErrorScreen';
import LoadingScreen from '@/components/LoadingScreen';
import MatchesList, { MatchesListProps } from '@/components/MatchesList';
import { Swiper, useControlledSwiper } from '@/components/Swiper';
import { useInsets } from '@/lib/useInsets';
import { getWakeTimeDayStart } from '@/utils/wakeTime';
import { useScopePicker } from '@/zustand/useScopePicker';

export function MatchesSwiper() {
    const { props, isLoading, error } = useMatchlistProps();

    const insets = useInsets(true, true);

    const { groupId, activeSeason } = useGroup();
    const scopePicker = useScopePicker();

    const seasonsQuery = useAllSeasonsQuery(groupId);

    const pastSeasons = getPastSeasons(seasonsQuery.data?.data);

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
                <AllTimeMatchesList
                    {...props}
                    contentContainerStyle={{
                        paddingTop: insets.top,
                        paddingBottom: insets.bottom + 64,
                    }}
                    pastSeasonIds={pastSeasons.map((i) => i.id!)}
                />
            )}
        </Swiper>
    );
}

/**
 * The current season's matches and every past season's. Its own component, so the past
 * seasons load when the pager mounts this page, not with the matches tab.
 */
function AllTimeMatchesList({
    pastSeasonIds,
    matches: seasonMatches,
    ...props
}: MatchesListProps & { pastSeasonIds: string[] }) {
    const { groupId } = useGroup();

    const { matchesBySeason } = useSeasonMatches(groupId, pastSeasonIds);

    const matches = useMemo(
        () =>
            seasonMatches.concat(
                pastSeasonIds.flatMap(
                    (id): Match[] => matchesBySeason.get(id) ?? []
                )
            ),
        [seasonMatches, pastSeasonIds, matchesBySeason]
    );

    return (
        <MatchesList
            {...props}
            matches={matches}
            ListEmptyComponent={
                <NoMatchesPlayedYet message="No matches played yet in this group." />
            }
        />
    );
}
