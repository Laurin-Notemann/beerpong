import * as React from 'react';
import { ScrollView } from 'react-native';

import { useAllSeasonsQuery, useGroup } from '@/api/calls/seasonHooks';
import { useNavigation } from '@/app/navigation/useNavigation';
import { useInsets } from '@/app/useInsets';
import ErrorScreen from '@/components/ErrorScreen';
import LoadingScreen from '@/components/LoadingScreen';
import { Swiper, useControlledSwiper } from '@/components/Swiper';
import {
    PastSeasonsEmptyScreen,
    SeasonCard,
} from '@/screens/PastSeasonsEmptyScreen';
import { useTheme } from '@/theme';
import { useScopePicker } from '@/zustand/useScopePicker';

/**
 * <Carousel /> intercepts touch events, so we can't wrap it inside a scrollview. instead, we have to put each item inside a scrollview.
 */

export function PastSeasonsSwiper() {
    const scopePicker = useScopePicker();

    const swiper = useControlledSwiper(
        scopePicker.pastSeasonsSwiperProgress,
        'pastSeasons'
    );

    const theme = useTheme();

    const nav = useNavigation();

    const { groupId } = useGroup();

    const seasonsQuery = useAllSeasonsQuery(groupId);

    const seasons =
        seasonsQuery.data?.data
            ?.filter((i) => i.endDate != null)
            ?.filter((i) => i.numMatches > 0) ?? [];

    const insets = useInsets(true, true);

    function onPlayerPress(id: string) {
        nav.navigate('player', { id });
    }

    if (seasonsQuery.isLoading) return <LoadingScreen />;
    if (seasonsQuery.error) return <ErrorScreen error={seasonsQuery.error} />;

    if (seasons.length === 0) return <PastSeasonsEmptyScreen />;

    return (
        <Swiper {...swiper} withPeek>
            {seasons.map((season) => {
                const rankingAlgorithm =
                    scopePicker.rankingAlgorithm ??
                    season.seasonSettings?.rankingAlgorithm ??
                    'ELO';

                return (
                    <ScrollView
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
                    >
                        <SeasonCard
                            minMatchesRequiredToBeRanked={
                                season.seasonSettings?.minMatchesToQualify ?? 0
                            }
                            season={{
                                name: season.name!,
                                startDate: season.startDate!,
                                endDate: season.endDate!,
                            }}
                            numMatches={season.numMatches!}
                            players={season.players}
                            rankingAlgorithm={rankingAlgorithm}
                            onPlayerPress={onPlayerPress}
                            style={{
                                paddingBottom: insets.bottom - 24,
                            }}
                        />
                    </ScrollView>
                );
            })}
        </Swiper>
    );
}
