import * as React from 'react';

import { useAllSeasonsQuery, useGroup } from '@/api/calls/seasonHooks';
import { useMatchlistProps } from '@/api/propHooks/matchlistPropHooks';
import { matchDtoToMatch } from '@/api/utils/matchDtoToMatch';
import { useInsets } from '@/app/useInsets';
import ErrorScreen from '@/components/ErrorScreen';
import LoadingScreen from '@/components/LoadingScreen';
import MatchesList from '@/components/MatchesList';
import { Swiper, useControlledSwiper } from '@/components/Swiper';
import { PastSeasonsEmptyScreen } from '@/screens/PastSeasonsEmptyScreen';
import { useTheme } from '@/theme';
import { useScopePicker } from '@/zustand/useScopePicker';

/**
 * <Carousel /> intercepts touch events, so we can't wrap it inside a scrollview. instead, we have to put each item inside a scrollview.
 */

export function PastMatchesSwiper() {
    const scopePicker = useScopePicker();

    const swiper = useControlledSwiper(
        scopePicker.pastSeasonsSwiperProgress,
        'pastMatches'
    );

    const theme = useTheme();

    const { groupId } = useGroup();

    const seasonsQuery = useAllSeasonsQuery(groupId);

    const seasons =
        seasonsQuery.data?.data
            ?.filter((i) => i.endDate != null)
            ?.filter((i) => i.numMatches > 0) ?? [];

    const insets = useInsets(true, true);

    const { props, isLoading, error } = useMatchlistProps();

    if (isLoading || seasonsQuery.isLoading) return <LoadingScreen />;
    if (seasonsQuery.isError || error)
        return <ErrorScreen error={seasonsQuery.error ?? error} />;

    if (seasons.length === 0) return <PastSeasonsEmptyScreen />;

    return (
        <Swiper {...swiper} withPeek>
            {seasons.map((season) => {
                return (
                    <MatchesList
                        background={false}
                        contentContainerStyle={{
                            paddingBottom: insets.bottom + 48,
                        }}
                        {...props}
                        matches={season.matches.map(
                            matchDtoToMatch(season.rawPlayers, season.ruleMoves)
                        )}
                        style={{
                            marginTop: insets.top,
                            marginBottom: insets.bottom + 7,

                            marginHorizontal: theme.carousel.peekGap / 2,
                            left:
                                theme.carousel.peekGap / 2 +
                                theme.carousel.peekSize,

                            borderRadius: theme.borderRadius.card,
                            backgroundColor: theme.color.modal.bg,
                        }}
                    />
                );
            })}
        </Swiper>
    );
}
