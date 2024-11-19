import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Text } from 'react-native';
import {
    GestureHandlerRootView,
    ScrollView,
} from 'react-native-gesture-handler';

import { HeaderItem } from '@/app/(tabs)/_layout';
import { useNavigation } from '@/app/navigation/useNavigation';
import Avatar from '@/components/Avatar';
import MatchesList, { Match } from '@/components/MatchesList';
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

    return (
        <GestureHandlerRootView>
            <Stack.Screen
                options={{
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
                {editable ? (
                    <MenuSection
                        style={{
                            width: '100%',
                        }}
                    >
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
                    <>
                        <MenuSection
                            style={{
                                alignSelf: 'stretch',
                            }}
                        >
                            <MenuItem
                                title="Past Seasons"
                                headIcon="pencil-outline"
                                tailContent={pastSeasons}
                                tailIconType="next"
                                onPress={() => nav.navigate('pastSeasons')}
                            />
                        </MenuSection>
                        <MatchesList matches={matches} />
                    </>
                )}
            </ScrollView>
        </GestureHandlerRootView>
    );
}
