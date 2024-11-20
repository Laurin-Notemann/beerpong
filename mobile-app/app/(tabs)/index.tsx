import dayjs from 'dayjs';
import { Text } from 'react-native';
import {
    GestureHandlerRootView,
    ScrollView,
} from 'react-native-gesture-handler';

import { useGroup } from '@/api/calls/seasonHooks';
import { env } from '@/api/env';
import { useLeaderboardProps } from '@/api/propHooks/leaderboardPropHooks';
import Leaderboard from '@/components/Leaderboard';
import { theme } from '@/theme';

export default function Page() {
    const { groupId, seasonId, group } = useGroup();

    const { players } = useLeaderboardProps(groupId, seasonId ?? null);

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
                    {group.data?.activeSeason?.startDate
                        ? `Started ${env.format.date.seasonStartAndEnd(
                              dayjs(group.data.activeSeason.startDate)
                          )}`
                        : null}
                </Text>
                <Text
                    style={{
                        fontSize: 17,
                        color: theme.color.text.secondary,
                        marginTop: 32 - 6,
                    }}
                >
                    {group.data?.numberOfPlayers ?? 0} players ·{' '}
                    {group.data?.numberOfMatches ?? 0} matches
                </Text>
                <Leaderboard players={players} />
            </ScrollView>
        </GestureHandlerRootView>
    );
}
