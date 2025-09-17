import * as React from 'react';
import { Stack } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { useAllSeasonsQuery, useGroup } from '@/api/calls/seasonHooks';
import { useNavStyles } from '@/app/navigation/navStyles';
import { useNavigation } from '@/app/navigation/useNavigation';
import { useInsets } from '@/app/useInsets';
import ErrorScreen from '@/components/ErrorScreen';
import LoadingScreen from '@/components/LoadingScreen';
import { Swiper, useSwiper } from '@/components/Swiper';
import { RankingAlgorithm } from '@/constants/rankingAlgorithms';
import {
    PastSeasonsEmptyScreen,
    SeasonCard,
} from '@/screens/PastSeasonsEmptyScreen';
import { useTheme } from '@/theme';

/**
 * <Carousel /> intercepts touch events, so we can't wrap it inside a scrollview. instead, we have to put each item inside a scrollview.
 */
export default function Page() {
    const theme = useTheme();

    const navStyles = useNavStyles();

    return (
        <View style={{ flex: 1, backgroundColor: theme.color.bg }}>
            <Stack.Screen
                options={{
                    ...navStyles,
                    headerTitle: 'Past Seasons',
                }}
            />
            <PastSeasonsSwiper
                swiper={useSwiper({
                    initialPage: 1,
                })}
            />
        </View>
    );
}

export function PastSeasonsSwiper({
    swiper,
    rankingAlgorithm,
}: {
    swiper: any;
    rankingAlgorithm?: RankingAlgorithm;
}) {
    const theme = useTheme();

    const nav = useNavigation();

    const { groupId } = useGroup();

    const seasonsQuery = useAllSeasonsQuery(groupId);

    const seasons =
        seasonsQuery.data?.data
            ?.filter((i) => i.endDate != null)
            ?.filter((i) => i.numMatches > 0) ?? [];

    const insets = useInsets(true, true);

    if (seasonsQuery.isLoading) return <LoadingScreen />;
    if (!seasonsQuery.data?.data)
        return <ErrorScreen error={seasonsQuery.error} />;

    if (seasons.length === 0) return <PastSeasonsEmptyScreen />;

    return (
        <Swiper {...swiper} withPeek>
            {seasons.map((season) => (
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
                        rankingAlgorithm={
                            rankingAlgorithm ??
                            season.seasonSettings?.rankingAlgorithm
                        }
                        onPlayerPress={(id) =>
                            nav.navigate('player', {
                                id,
                                scope: season.id!,
                            })
                        }
                        style={{
                            paddingBottom: insets.bottom - 24,
                        }}
                    />
                </ScrollView>
            ))}
        </Swiper>
    );
}
