import { Stack } from 'expo-router';
import { ScrollView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import Leaderboard from '@/components/Leaderboard';
import { Heading } from '@/components/Menu/MenuSection';
import Text from '@/components/Text';
import { theme } from '@/theme';

import { navStyles } from './navigation/navStyles';

export default function Page() {
    return (
        <GestureHandlerRootView>
            <Stack.Screen
                options={{
                    ...navStyles,
                    headerTitle: 'About the Elo Algorithm',
                }}
            />
            <ScrollView
                style={{
                    flex: 1,

                    backgroundColor: theme.color.bg,
                }}
                contentContainerStyle={{
                    paddingHorizontal: 16,

                    gap: 8,
                }}
            >
                <Heading title="Why ranking by average can be tricky" />
                <Text color="primary">
                    The most straight-forward way to rank players is to rank
                    them by their average points per match. However, this has
                    two drawbacks: (1) smurfing (2) disincentivizing larger team
                </Text>
                <Heading title="How Elo ranking works" />
                <Text color="primary">Lorem ipsum dolor sit amet</Text>
                <Leaderboard
                    withPodium={false}
                    style={{
                        transform: [{ scale: 0.8 }],
                        pointerEvents: 'none',

                        borderRadius: theme.borderRadius.card,
                        backgroundColor: theme.color.modal.bg,
                    }}
                    players={[
                        {
                            id: '#1',
                            elo: 2,
                            name: 'Moritz',
                            points: 2,
                            matches: 3,
                            matchesWon: 3,
                        },
                        {
                            id: '#2',
                            elo: 2,
                            name: 'Laurin',
                            points: 2,
                            matches: 3,
                            matchesWon: 3,
                        },
                        {
                            id: '#3',
                            elo: 2,
                            name: 'Schicke',
                            points: 2,
                            matches: 3,
                            matchesWon: 3,
                        },
                        {
                            id: '#4',
                            elo: 2,
                            name: 'Ole',
                            points: 2,
                            matches: 3,
                            matchesWon: 3,
                        },
                        {
                            id: '#5',
                            elo: 2,
                            name: 'Elina',
                            points: 2,
                            matches: 3,
                            matchesWon: 3,
                        },
                    ]}
                />
            </ScrollView>
        </GestureHandlerRootView>
    );
}
