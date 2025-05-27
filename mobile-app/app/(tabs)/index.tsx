import dayjs from 'dayjs';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import {
    GestureHandlerRootView,
    ScrollView,
} from 'react-native-gesture-handler';

import { useGroup } from '@/api/calls/seasonHooks';
import { env } from '@/api/env';
import { useLeaderboardProps } from '@/api/propHooks/leaderboardPropHooks';
import { usePullToRefresh, useQueryInvalidation } from '@/api/utils/reactQuery';
import { AppBackground } from '@/app/Background';
import { useNavigation } from '@/app/navigation/useNavigation';
import { useInsets } from '@/app/useInsets';
import ConfirmationModal from '@/components/ConfirmationModal';
import copyToClipboard from '@/components/copyToClipboard';
import Leaderboard from '@/components/Leaderboard';
import { LeaderBoardSeasonInfo } from '@/components/Leaderboard/LeaderboardSeasonInfo';
import PillButton from '@/components/PillButton';
import { RefreshControl } from '@/components/RefreshControl';
import { useTheme } from '@/theme';
import { formatGroupCode } from '@/utils/groupCode';
import { useLocalSettings } from '@/zustand/localSettingsStore';

export default function Page() {
    const nav = useNavigation();
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

    const insets = useInsets(true, true);

    const theme = useTheme();

    return (
        <GestureHandlerRootView>
            <AppBackground />
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
                }}
                contentContainerStyle={{
                    alignItems: 'center',

                    paddingTop: insets.top,
                    paddingBottom: insets.bottom,
                }}
                refreshControl={<RefreshControl {...refresh} />}
            >
                <LeaderBoardSeasonInfo
                    numPlayers={group.data?.numberOfPlayers ?? 0}
                    numMatches={group.data?.numberOfMatches ?? 0}
                    startDate={group.data?.activeSeason?.startDate!}
                    isCurrentSeason
                />
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
                <Leaderboard
                    players={players}
                    onPlayerPress={(id) => nav.navigate('player', { id })}
                />
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
