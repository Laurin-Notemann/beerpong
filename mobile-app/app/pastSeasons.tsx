import * as React from 'react';
import dayjs from 'dayjs';
import { Stack } from 'expo-router';
import {
    Dimensions,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import Carousel from 'react-native-reanimated-carousel';

import { useAllSeasonsQuery, useGroup } from '@/api/calls/seasonHooks';
import { env } from '@/api/env';
import { navStyles } from '@/app/navigation/navStyles';
import { useNavigation } from '@/app/navigation/useNavigation';
import ErrorScreen from '@/components/ErrorScreen';
import { HeaderItem } from '@/components/HeaderItem';
import Leaderboard from '@/components/Leaderboard';
import LoadingScreen from '@/components/LoadingScreen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { theme } from '@/theme';

const { width, height } = Dimensions.get('window');

/**
 * TODO: use <SwiperHeader /> with <PaginationDot />
 */
function Card({
    season,
    players,
    numMatches,
}: {
    season: { name: string; startDate: string; endDate: string };
    players: any[];
    numMatches: number;
}) {
    return (
        <ThemedView style={styles.card}>
            <ThemedText
                type="title"
                style={{
                    fontSize: 25,
                    color: theme.color.text.primary,
                    marginTop: 48,
                }}
            >
                {season.name}
            </ThemedText>
            <ThemedText
                style={{
                    fontSize: 12,
                    color: theme.color.text.secondary,
                    marginTop: 3,
                }}
            >
                {env.format.date.seasonStartAndEnd(dayjs(season.startDate))} -{' '}
                {env.format.date.seasonStartAndEnd(dayjs(season.endDate))}
            </ThemedText>
            <ThemedText
                style={{
                    fontSize: 17,
                    color: theme.color.text.secondary,
                    marginTop: 32 - 6,
                }}
            >
                {players.length} players · {numMatches} matches
            </ThemedText>
            <Leaderboard players={players} />
        </ThemedView>
    );
}

/**
 * <Carousel /> intercepts touch events, so we can't wrap it inside a scrollview. instead, we have to put each item inside a scrollview.
 */
export default function Page() {
    const nav = useNavigation();

    const { groupId } = useGroup();

    const seasonsQuery = useAllSeasonsQuery(groupId);

    const seasons =
        seasonsQuery.data?.data?.filter((i) => i.endDate != null) ?? [];

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
                    headerRight: () => (
                        <HeaderItem onPress={() => nav.goBack()}>
                            Done
                        </HeaderItem>
                    ),
                }}
            />
            <Carousel
                data={seasons}
                height={height - 90}
                loop={false}
                width={
                    width - theme.carousel.peekGap - theme.carousel.peekSize * 2
                }
                style={{ width }}
                renderItem={(season) => (
                    <SafeAreaView>
                        <ScrollView
                            style={{
                                marginHorizontal: theme.carousel.peekGap / 2,
                                left:
                                    theme.carousel.peekGap / 2 +
                                    theme.carousel.peekSize,

                                borderRadius: theme.borderRadius.card,
                                backgroundColor: theme.color.modal.bg,
                            }}
                        >
                            <Card
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
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        alignItems: 'center',
        flex: 1,
    },
});
