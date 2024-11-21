import dayjs from 'dayjs';
import { useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import {
    GestureHandlerRootView,
    ScrollView,
} from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useGroup } from '@/api/calls/seasonHooks';
import { env } from '@/api/env';
import { useLeaderboardProps } from '@/api/propHooks/leaderboardPropHooks';
import ConfirmationModal from '@/components/ConfirmationModal';
import Leaderboard from '@/components/Leaderboard';
import { theme } from '@/theme';

export default function Page() {
    const { groupId, seasonId, group } = useGroup();

    const { players } = useLeaderboardProps(groupId, seasonId ?? null);

    const [showChangeWallpaperModal, setShowChangeWallpaperModal] =
        useState(false);

    const [sortingAlgorithm, setSortingAlgorithm] = useState<'ELO' | 'AVERAGE'>(
        'ELO'
    );

    return (
        <GestureHandlerRootView>
            <ConfirmationModal
                onClose={() => setShowChangeWallpaperModal(false)}
                title="Sort Players By"
                actions={
                    [
                        {
                            title: 'Elo (Group Default)',

                            onPress: () => {
                                setSortingAlgorithm('ELO');
                                setShowChangeWallpaperModal(false);
                            },
                        },
                        {
                            title: 'Average Points Scored',

                            onPress: () => {
                                setSortingAlgorithm('AVERAGE');
                                setShowChangeWallpaperModal(false);
                            },
                        },
                    ] as const
                }
                isVisible={showChangeWallpaperModal}
            />
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
                <TouchableOpacity
                    onPress={() => setShowChangeWallpaperModal(true)}
                >
                    <Icon color="#fff" size={24} name="sort" />
                </TouchableOpacity>
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
