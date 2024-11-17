import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import {
    GestureHandlerRootView,
    ScrollView,
} from 'react-native-gesture-handler';

import { HeaderItem } from '@/app/(tabs)/_layout';
import { useNavigation } from '@/app/navigation/useNavigation';
import Avatar from '@/components/Avatar';
import { HighestChip, LowestChip } from '@/components/Chip';
import MatchesList, { Match } from '@/components/MatchesList';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { theme } from '@/theme';

import PlayerStats from '../PlayerStats';

export function Stat({
    value,
    title,
    isHighest = false,
    isLowest = false,
}: {
    value: string | number;
    title: string;
    isHighest?: boolean;
    isLowest?: boolean;
}) {
    return (
        <View style={{ alignItems: 'center' }}>
            {isHighest && <HighestChip />}
            {isLowest && <LowestChip />}
            <Text
                style={{
                    fontSize: 17,
                    color: theme.color.text.primary,

                    fontWeight: 600,
                }}
            >
                {value}
            </Text>
            <Text
                style={{
                    fontSize: 12,
                    color: theme.color.text.secondary,

                    fontWeight: 500,
                }}
            >
                {title}
            </Text>
        </View>
    );
}

export interface PlayerScreenProps {
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
}
export default function PlayerScreen({
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
}: PlayerScreenProps) {
    const nav = useNavigation();

    const averagePointsPerMatch = points / matches.length;

    const hasMatches = matches.length > 0;

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
                    size={96}
                    style={{ marginTop: 32, marginBottom: 8 }}
                    placement={placement}
                    name={name}
                />
                <Text
                    style={{
                        fontSize: 15,
                        color: theme.color.text.secondary,
                    }}
                >
                    {hasMatches ? averagePointsPerMatch?.toFixed(1) : '--'}
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
                            onPress={() => nav.navigate('editPlayerName')}
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
