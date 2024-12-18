import { Stack } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import {
    GestureHandlerRootView,
    RefreshControl,
    ScrollView,
} from 'react-native-gesture-handler';

import { env } from '@/api/env';
import { Match } from '@/api/utils/matchDtoToMatch';
import { navStyles } from '@/app/navigation/navStyles';
import { useNavigation } from '@/app/navigation/useNavigation';
import Avatar from '@/components/Avatar';
import { HeaderItem } from '@/components/HeaderItem';
import MatchesList from '@/components/MatchesList';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { theme } from '@/theme';

import PlayerStats from '../PlayerStats';

export interface PlayerScreenProps {
    id: string;
    placement: number;

    name: string;
    avatarUrl?: string | null;

    matches: Match[];
    matchesWon: number;
    points: number;
    elo: number;
    hasPremium?: boolean;

    pastSeasons: number;

    onDelete?: () => void;
    onUploadAvatarPress: () => void;
}
export default function PlayerScreen({
    id,
    placement,
    name,
    avatarUrl,
    matches,
    matchesWon,
    points,
    elo,
    pastSeasons,
    hasPremium = false,

    onDelete,
    onUploadAvatarPress,
}: PlayerScreenProps) {
    const nav = useNavigation();

    // account for division by zero
    const averagePointsPerMatch =
        matches.length > 0 ? (points / matches.length).toFixed(1) : '--';

    const [editable, setEditable] = useState(false);

    const [isRefreshing, setIsRefreshing] = useState(false);

    const onRefresh = useCallback(() => {
        setIsRefreshing(true);
        setTimeout(() => {
            setIsRefreshing(false);
        }, 2000);
    }, []);

    return (
        <GestureHandlerRootView>
            <Stack.Screen
                options={{
                    ...navStyles,

                    headerBackTitleVisible: false,
                    title: '',
                    headerTitle: 'Player',
                    headerRight: () => (
                        <HeaderItem
                            onPress={() => setEditable((prev) => !prev)}
                        >
                            {editable ? 'Done' : 'Edit'}
                        </HeaderItem>
                    ),
                }}
            />
            <ScrollView
                style={{
                    flex: 1,

                    backgroundColor: theme.color.bg,
                }}
                contentContainerStyle={{
                    alignItems: 'center',

                    paddingHorizontal: 16,
                    paddingBottom: 32,
                }}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={onRefresh}
                    />
                }
            >
                <Avatar
                    url={avatarUrl}
                    size={96}
                    style={{ marginTop: 32, marginBottom: 8 }}
                    placement={placement}
                    name={name}
                    canUpload={editable}
                    onPress={onUploadAvatarPress}
                />
                <Text
                    style={{
                        fontSize: 15,
                        color: theme.color.text.secondary,
                    }}
                >
                    {averagePointsPerMatch}
                </Text>
                <Text
                    style={{
                        fontSize: 25,
                        color: theme.color.text.primary,

                        marginBottom: 32,
                    }}
                >
                    {name}
                </Text>

                <PlayerStats
                    totalPoints={points}
                    matchesWonCount={matchesWon}
                    matchesPlayedCount={matches.length}
                    elo={elo}
                />
                <View
                    style={{
                        width: '100%',
                        alignItems: 'stretch',
                    }}
                >
                    {editable ? (
                        <MenuSection>
                            <MenuItem
                                title={name}
                                headIcon="pencil-outline"
                                onPress={() =>
                                    nav.navigate('editPlayerName', { id })
                                }
                                tailIconType="next"
                            />
                            <MenuItem
                                title="Delete Player"
                                headIcon="delete-outline"
                                onPress={onDelete}
                                type="danger"
                                confirmationPrompt={{
                                    title: 'Delete Player',
                                    description:
                                        'Are you sure you want to delete this player?',
                                }}
                            />
                        </MenuSection>
                    ) : (
                        env.isDev && (
                            <>
                                <MenuSection>
                                    <MenuItem
                                        title="Past Seasons"
                                        headIcon="pencil-outline"
                                        tailContent={pastSeasons}
                                        tailIconType="next"
                                        onPress={() =>
                                            nav.navigate('pastSeasons')
                                        }
                                    />
                                </MenuSection>
                                <MatchesList matches={matches} />
                            </>
                        )
                    )}
                </View>
            </ScrollView>
        </GestureHandlerRootView>
    );
}
