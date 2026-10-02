import { useMemo } from 'react';

import { useAllSeasonsQuery, useGroup } from '@/api/calls/seasonHooks';
import { useMatchlistProps } from '@/api/propHooks/matchlistPropHooks';
import { matchDtoToMatch } from '@/api/utils/matchDtoToMatch';
import ErrorScreen from '@/components/ErrorScreen';
import LoadingScreen from '@/components/LoadingScreen';
import MatchesList from '@/components/MatchesList';
import { usePastSeasonCardStyle } from '@/components/screens/usePastSeasonCardStyle';
import { Swiper, useControlledSwiper } from '@/components/Swiper';
import { PastSeasonsEmptyScreen } from '@/screens/PastSeasonsEmptyScreen';
import { useScopePicker } from '@/zustand/useScopePicker';

export function PastMatchesSwiper() {
    const scopePicker = useScopePicker();

    const swiper = useControlledSwiper(scopePicker.pastSeasonsSwiperProgress);

    const { groupId } = useGroup();

    const seasonsQuery = useAllSeasonsQuery(groupId);

    const seasons =
        seasonsQuery.data?.data
            ?.filter((i) => i.endDate != null)
            ?.filter((i) => i.numMatches > 0) ?? [];

    const allSeasons = seasonsQuery.data?.data;
    const seasonMatches = useMemo(
        () =>
            new Map(
                (allSeasons ?? []).map((season) => [
                    season.id!,
                    season.matches.map(
                        matchDtoToMatch(season.rawPlayers, season.ruleMoves)
                    ),
                ])
            ),
        [allSeasons]
    );

    const cardStyle = usePastSeasonCardStyle();

    const { props, isLoading, error } = useMatchlistProps();

    if (isLoading || seasonsQuery.isLoading) return <LoadingScreen />;
    if (seasonsQuery.isError || error)
        return <ErrorScreen error={seasonsQuery.error ?? error} />;

    if (seasons.length === 0) return <PastSeasonsEmptyScreen />;

    return (
        <Swiper {...swiper} lazyWindow={1}>
            {seasons.map((season) => (
                <MatchesList
                    key={season.id}
                    contentContainerStyle={{ paddingBottom: 48 }}
                    {...props!}
                    matches={seasonMatches.get(season.id!) ?? []}
                    style={cardStyle}
                />
            ))}
        </Swiper>
    );
}
