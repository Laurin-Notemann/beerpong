import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { RefreshControl } from 'react-native-gesture-handler';

import { useDeleteMatchMutation, useMatchQuery } from '@/api/calls/matchHooks';
import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { matchDtoToMatch } from '@/api/utils/matchDtoToMatch';
import { navStyles } from '@/app/navigation/navStyles';
import MatchPlayers from '@/components/MatchPlayers';
import MatchVsHeader from '@/components/MatchVsHeader';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { theme } from '@/theme';
import { showErrorToast, showSuccessToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';

import { HeaderItem } from '../components/HeaderItem';
import { useNavigation } from './navigation/useNavigation';

export default function Page() {
    const [isEditing, setIsEditing] = useState(false);

    const { groupId, seasonId } = useGroup();

    const playersQuery = usePlayersQuery(groupId, seasonId);

    const players = playersQuery.data?.data ?? [];

    const { id } = useLocalSearchParams<{ id: string }>();

    const matchQuery = useMatchQuery(groupId, seasonId, id);

    const movesQuery = useMoves(groupId, seasonId);

    const allowedMoves = movesQuery.data?.data ?? [];

    const { mutateAsync } = useDeleteMatchMutation();

    const nav = useNavigation();

    const match = matchQuery.data?.data
        ? matchDtoToMatch(players, allowedMoves)(matchQuery.data.data)
        : null;

    async function onDelete() {
        if (!groupId || !seasonId || !id) return;

        try {
            await mutateAsync({
                groupId,
                seasonId,
                id,
            });
            showSuccessToast('Deleted match.');
            nav.goBack();
        } catch (err) {
            ConsoleLogger.error('failed to delete match:', err);
            showErrorToast('Failed to delete match.');
        }
    }

    function setMoveCount(userId: string, moveId: string, count: number) {
        // setPlayers((prev) => {
        //     const copy: typeof prev = JSON.parse(JSON.stringify(prev));
        //     const player = copy.find((i) => i.id === userId);
        //     if (!player) return prev;
        //     const move = player?.moves.find((i) => i.id === moveId);
        //     if (!move) return prev;
        //     move.count = count;
        //     return copy;
        // });
    }

    const [isRefreshing, setIsRefreshing] = useState(false);

    const onRefresh = useCallback(() => {
        setIsRefreshing(true);
        setTimeout(() => {
            setIsRefreshing(false);
        }, 2000);
    }, []);

    return (
        <>
            <Stack.Screen
                options={{
                    ...navStyles,
                    headerBackTitleVisible: false,
                    headerRight: () => (
                        <HeaderItem
                            onPress={() => {
                                setIsEditing((prev) => !prev);
                            }}
                        >
                            {isEditing ? 'Done' : 'Edit'}
                        </HeaderItem>
                    ),
                    headerTitle: () =>
                        match ? (
                            <MatchVsHeader
                                match={match}
                                style={{
                                    bottom: 4,
                                }}
                            />
                        ) : (
                            ''
                        ),
                }}
            />
            <ScrollView
                style={{
                    flex: 1,

                    backgroundColor: theme.color.bg,
                }}
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: 32,
                    paddingBottom: 32,
                }}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={onRefresh}
                    />
                }
            >
                <MatchPlayers
                    editable={isEditing}
                    players={(match?.blueTeam ?? [])
                        .concat(match?.redTeam ?? [])
                        .map((i) => ({
                            id: i.id!,
                            change: i.change,
                            moves: i.moves,
                            name: i.name,
                            avatarUrl: i.avatarUrl,
                            points: i.points,
                            team: i.team,
                        }))}
                    setMoveCount={setMoveCount}
                />
                {isEditing && (
                    <MenuSection
                        style={{
                            width: '100%',

                            marginTop: 24,
                        }}
                    >
                        <MenuItem
                            title="Delete Match"
                            headIcon="delete-outline"
                            onPress={onDelete}
                            type="danger"
                            confirmationPrompt={{
                                title: 'Delete Match',
                                description:
                                    'Are you sure you want to delete this match?',
                            }}
                        />
                    </MenuSection>
                )}
            </ScrollView>
        </>
    );
}
