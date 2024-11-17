import { Text } from 'react-native';
import {
    GestureHandlerRootView,
    ScrollView,
} from 'react-native-gesture-handler';

import { useGroupQuery } from '@/api/calls/groupHooks';
import { useLeaderboardProps } from '@/api/propHooks/leaderboardPropHooks';
import Leaderboard from '@/components/Leaderboard';
import { theme } from '@/theme';
import { useGroupStore } from '@/zustand/group/stateGroupStore';

export default function Page() {
    const { selectedGroupId } = useGroupStore();
    const { data } = useGroupQuery(selectedGroupId);
    const { players } = useLeaderboardProps(
        selectedGroupId,
        data?.data?.activeSeason?.id ?? null
    );

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
                <Leaderboard players={players} />
            </ScrollView>
        </GestureHandlerRootView>
    );
}
