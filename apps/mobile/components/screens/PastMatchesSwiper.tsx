import {
    getPastSeasons,
    useAllSeasonsQuery,
    useGroup,
} from '@/api/calls/seasonHooks';
import { useSeasonMatches } from '@/api/calls/seasonMatchesHooks';
import { useMatchlistProps } from '@/api/propHooks/matchlistPropHooks';
import ErrorScreen from '@/components/ErrorScreen';
import LoadingScreen from '@/components/LoadingScreen';
import MatchesList, { MatchesListProps } from '@/components/MatchesList';
import { PastSeasonsEmptyScreen } from '@/components/screens/PastSeasonsEmptyScreen';
import { usePastSeasonCardStyle } from '@/components/screens/usePastSeasonCardStyle';
import { Swiper, useControlledSwiper } from '@/components/Swiper';
import { useScopePicker } from '@/zustand/useScopePicker';

export function PastMatchesSwiper() {
    const scopePicker = useScopePicker();

    const swiper = useControlledSwiper(scopePicker.pastSeasonsSwiperProgress);

    const { groupId } = useGroup();

    const seasonsQuery = useAllSeasonsQuery(groupId);

    const seasons = getPastSeasons(seasonsQuery.data?.data);

    const { props, isLoading, error } = useMatchlistProps();

    if (isLoading || seasonsQuery.isLoading) return <LoadingScreen />;
    if (seasonsQuery.isError || error)
        return <ErrorScreen error={seasonsQuery.error ?? error} />;

    if (seasons.length === 0) return <PastSeasonsEmptyScreen />;

    return (
        <Swiper {...swiper} lazyWindow={1}>
            {seasons.map((season) => (
                <PastSeasonMatches
                    key={season.id}
                    {...props!}
                    seasonId={season.id!}
                />
            ))}
        </Swiper>
    );
}

/** One past season's matches; they load when the pager mounts its page. */
function PastSeasonMatches({
    seasonId,
    ...props
}: Omit<MatchesListProps, 'matches'> & { seasonId: string }) {
    const { groupId } = useGroup();

    const { matchesBySeason } = useSeasonMatches(groupId, [seasonId]);

    const cardStyle = usePastSeasonCardStyle();

    return (
        <MatchesList
            contentContainerStyle={{ paddingBottom: 48 }}
            {...props}
            matches={matchesBySeason.get(seasonId) ?? []}
            style={cardStyle}
        />
    );
}
