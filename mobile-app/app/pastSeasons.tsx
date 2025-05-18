import * as React from 'react';
import { Stack } from 'expo-router';
import { Dimensions, ScrollView, StyleSheet } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';

import { navStyles } from '@/app/navigation/navStyles';
import { HeaderItem } from '@/components/HeaderItem';
import Leaderboard from '@/components/Leaderboard';
import { mockPlayers } from '@/components/mockData/players';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { theme } from '@/theme';

const { width, height } = Dimensions.get('window');

/**
 * TODO: use <SwiperHeader /> with <PaginationDot />
 */
function Card() {
    const players = mockPlayers;

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
                Kroatien
            </ThemedText>
            <ThemedText
                style={{
                    fontSize: 12,
                    color: theme.color.text.secondary,
                    marginTop: 3,
                }}
            >
                9.9.2024 - 16.9.2024
            </ThemedText>
            <ThemedText
                style={{
                    fontSize: 17,
                    color: theme.color.text.secondary,
                    marginTop: 32 - 6,
                }}
            >
                {players.length} players · 78 matches
            </ThemedText>
            <Leaderboard players={players} />
        </ThemedView>
    );
}

/**
 * <Carousel /> intercepts touch events, so we can't wrap it inside a scrollview. instead, we have to put each item inside a scrollview.
 */
export default function Page() {
    return (
        <>
            <Stack.Screen
                options={{
                    ...navStyles,
                    headerBackTitleVisible: false,
                    headerTitle: 'Past Seasons',
                    headerRight: () => <HeaderItem>Done</HeaderItem>,
                }}
            />
            <Carousel
                data={[0, 0, 0, 0, 0]}
                height={height - 90}
                loop={false}
                width={
                    width -
                    theme.carousel.peekGap * 2 -
                    theme.carousel.peekSize * 2
                }
                style={{ width }}
                renderItem={() => (
                    <ScrollView
                        style={{
                            marginHorizontal: theme.carousel.peekGap,
                            left:
                                theme.carousel.peekGap +
                                theme.carousel.peekSize,
                        }}
                    >
                        <Card />
                    </ScrollView>
                )}
            />
        </>
    );
}

const styles = StyleSheet.create({
    card: {
        alignItems: 'center',
        flex: 1,

        borderRadius: theme.borderRadius.card,
        backgroundColor: theme.color.modal.bg,
    },
});
