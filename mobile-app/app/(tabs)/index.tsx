import dayjs from 'dayjs';
import React, { useCallback, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import {
    GestureHandlerRootView,
    RefreshControl,
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

    const [isRefreshing, setIsRefreshing] = useState(false);

    const onRefresh = useCallback(() => {
        setIsRefreshing(true);
        setTimeout(() => {
            setIsRefreshing(false);
        }, 2000);
    }, []);

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
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={onRefresh}
                    />
                }
            >
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
                {env.isDev && (
                    <View
                        style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}
                    >
                        <PillButton
                            label="Sort"
                            iconName="swap-vertical"
                            onPress={() => setShowChangeWallpaperModal(true)}
                        />
                        <PillButton
                            label="Invite"
                            iconName="share-outline"
                            onPress={() => setShowChangeWallpaperModal(true)}
                        />
                    </View>
                )}
                <Leaderboard players={players} />
                <Text
                    style={{
                        fontSize: 12,
                        color: theme.color.text.secondary,
                        marginTop: 32,
                        marginBottom: 32,
                    }}
                >
                    {group.data?.activeSeason?.startDate
                        ? `Leaderboard started ${env.format.date.seasonStartAndEnd(
                              dayjs(group.data.activeSeason.startDate)
                          )}`
                        : null}
                </Text>
            </ScrollView>
        </GestureHandlerRootView>
    );
}

const PillButton: React.FC<{
    label: string;
    iconName: string;
    onPress?: () => void;
}> = ({ label, iconName, onPress }) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={{
                height: 32,
                backgroundColor: '#333',
                borderRadius: 16,
                paddingLeft: 8,
                paddingRight: 16,
                alignItems: 'center',
                flexDirection: 'row',
            }}
        >
            <Icon color="#fff" size={20} name={iconName} />
            <Text
                style={{
                    fontSize: 12,
                    color: '#fff',
                    marginLeft: 4,
                    fontWeight: '700',
                }}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );
};
