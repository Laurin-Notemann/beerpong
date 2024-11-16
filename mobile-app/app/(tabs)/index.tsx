import { Text } from 'react-native';
import {
    GestureHandlerRootView,
    ScrollView,
} from 'react-native-gesture-handler';

import Leaderboard from '@/components/Leaderboard';
import { mockPlayers } from '@/components/mockData/players';
import { theme } from '@/theme';

export default function Page() {
    return (
        <GestureHandlerRootView>
            <ScrollView
                style={{
                    flex: 1,
                    backgroundColor: theme.color.bg,
                }}
                contentContainerStyle={{
                    alignItems: 'center',
                }}
            >
                <Text
                    style={{
                        fontSize: 12,
                        color: theme.color.text.secondary,
                        marginTop: 3,
                    }}
                >
                    Started 9.9.2024
                </Text>
                <Text
                    style={{
                        fontSize: 17,
                        color: theme.color.text.secondary,
                        marginTop: 32 - 6,
                    }}
                >
                    14 players · 78 matches
                </Text>
                <Leaderboard players={mockPlayers} />
            </ScrollView>
        </GestureHandlerRootView>
    );
}
