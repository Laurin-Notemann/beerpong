import dayjs from 'dayjs';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import {
    GestureHandlerRootView,
    RefreshControl,
    ScrollView,
} from 'react-native-gesture-handler';

import { useGroup } from '@/api/calls/seasonHooks';
import { env } from '@/api/env';
import { useLeaderboardProps } from '@/api/propHooks/leaderboardPropHooks';
import { usePullToRefresh, useQueryInvalidation } from '@/api/utils/reactQuery';
import ConfirmationModal from '@/components/ConfirmationModal';
import copyToClipboard from '@/components/copyToClipboard';
import Leaderboard from '@/components/Leaderboard';
import PillButton from '@/components/PillButton';
import { theme } from '@/theme';
import { formatGroupCode } from '@/utils/groupCode';
import { useLocalSettings } from '@/zustand/localSettingsStore';

export default function Page() {
    const { groupId, seasonId, group } = useGroup();

    const { players } = useLeaderboardProps(groupId, seasonId ?? null);

    const [showSortModal, setShowSortModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);

    const [sortingAlgorithm, setSortingAlgorithm] = useState<'ELO' | 'AVERAGE'>(
        'ELO'
    );

    const { invalidatePlayers } = useQueryInvalidation();

    const refresh = usePullToRefresh(() =>
        invalidatePlayers(groupId!, seasonId!)
    );

    const experiments = useLocalSettings();

    return (
        <GestureHandlerRootView>
            <ConfirmationModal
                onClose={() => setShowSortModal(false)}
                title="Sort Players By"
                actions={
                    [
                        {
                            title: 'Elo (Group Default)',

                            onPress: () => {
                                setSortingAlgorithm('ELO');
                                setShowSortModal(false);
                            },
                        },
                        {
                            title: 'Average Points Scored',

                            onPress: () => {
                                setSortingAlgorithm('AVERAGE');
                                setShowSortModal(false);
                            },
                        },
                    ] as const
                }
                isVisible={showSortModal}
            />
            <ConfirmationModal
                onClose={() => setShowInviteModal(false)}
                title="Invite Friends to this Group"
                actions={
                    [
                        {
                            title: 'Copy Group Code',

                            onPress: () => {
                                if (group.data?.inviteCode) {
                                    // this should always be true
                                    copyToClipboard(
                                        formatGroupCode(group.data.inviteCode)
                                    );
                                    setShowInviteModal(false);
                                }
                            },
                        },
                    ] as const
                }
                isVisible={showInviteModal}
            />
            <ScrollView
                style={{
                    flex: 1,
                    backgroundColor: theme.color.bg,
                }}
                contentContainerStyle={{
                    alignItems: 'center',
                }}
                refreshControl={<RefreshControl {...refresh} />}
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
                {experiments.eloAlgorithm && (
                    <View
                        style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}
                    >
                        <PillButton
                            label="Sort"
                            iconName="swap-vertical"
                            onPress={() => setShowSortModal(true)}
                        />
                        <PillButton
                            label="Invite"
                            iconName="share-outline"
                            onPress={() => setShowInviteModal(true)}
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
