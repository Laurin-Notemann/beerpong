import * as React from 'react';
import { Stack } from 'expo-router';
import { Dimensions, SafeAreaView, ScrollView, View } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';

import { useAllSeasonsQuery, useGroup } from '@/api/calls/seasonHooks';
import { useNavStyles } from '@/app/navigation/navStyles';
import ErrorScreen from '@/components/ErrorScreen';
import LoadingScreen from '@/components/LoadingScreen';
import {
    PastSeasonsEmptyScreen,
    SeasonCard,
} from '@/screens/PastSeasonsEmptyScreen';
import { useTheme } from '@/theme';

const { width, height } = Dimensions.get('window');

/**
 * <Carousel /> intercepts touch events, so we can't wrap it inside a scrollview. instead, we have to put each item inside a scrollview.
 */
export default function Page() {
    const theme = useTheme();

    const { groupId } = useGroup();

    const seasonsQuery = useAllSeasonsQuery(groupId);

    const navStyles = useNavStyles();

    const seasons =
        seasonsQuery.data?.data
            ?.filter((i) => i.endDate != null)
            // @ts-ignore TODO: type this properly
            ?.filter((i) => i.numMatches > 0) ?? [];

    if (seasonsQuery.isLoading) return <LoadingScreen />;
    if (!seasonsQuery.data?.data)
        return <ErrorScreen error={seasonsQuery.error} />;

    return (
        <View style={{ flex: 1, backgroundColor: theme.color.bg }}>
            <Stack.Screen
                options={{
                    ...navStyles,
                    headerBackTitleVisible: false,
                    headerTitle: 'Past Seasons',
                }}
            />
            {seasons.length === 0 && <PastSeasonsEmptyScreen />}
            {seasons.length > 0 && (
                <Carousel
                    data={seasons}
                    height={height - 90}
                    loop={false}
                    width={
                        width -
                        theme.carousel.peekGap -
                        theme.carousel.peekSize * 2
                    }
                    style={{ width }}
                    renderItem={(season) => (
                        <SafeAreaView>
                            <ScrollView
                                style={{
                                    marginHorizontal:
                                        theme.carousel.peekGap / 2,
                                    left:
                                        theme.carousel.peekGap / 2 +
                                        theme.carousel.peekSize,

                                    borderRadius: theme.borderRadius.card,
                                    backgroundColor: theme.color.modal.bg,

                                    minHeight: '100%',
                                }}
                            >
                                <SeasonCard
                                    minMatchesRequiredToBeRanked={
                                        season.item.seasonSettings
                                            ?.minMatchesToQualify ?? 0
                                    }
                                    season={{
                                        name: season.item.name!,
                                        startDate: season.item.startDate!,
                                        endDate: season.item.endDate!,
                                    }}
                                    // @ts-ignore TODO: type this properly
                                    numMatches={season.item.numMatches!}
                                    // @ts-ignore TODO: type this properly
                                    players={season.item.players}
                                />
                            </ScrollView>
                        </SafeAreaView>
                    )}
                />
            )}
        </View>
    );
}
