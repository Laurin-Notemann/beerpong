import { Stack, useNavigation } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import Button from '@/components/Button';
import MatchPlayers, { TeamMember } from '@/components/MatchPlayers';
import MatchVsHeader from '@/components/MatchVsHeader';
import { mockMatches } from '@/components/mockData/matches';
import { Feature } from '@/constants/Features';
import { theme } from '@/theme';

import { HeaderItem } from './(tabs)/_layout';

export default function Page() {
    const navigation = useNavigation();

    const [players, setPlayers] = useState<TeamMember[]>([
        {
            id: '#1',
            team: 'blue',
            name: 'Bolls',
            points: 1,
            change: 0.12,
            moves: [
                { id: '#1', count: 1, points: 1, title: 'Normal' },
                { id: '#2', count: 0, points: 2, title: 'Bomb' },
            ],
        },
        {
            id: '#2',
            team: 'red',
            name: 'Schügge',
            points: 0,
            change: -0.2,
            moves: [
                { id: '#1', count: 0, points: 1, title: 'Normal' },
                { id: '#2', count: 0, points: 2, title: 'Bomb' },
            ],
        },
    ]);

    function setMoveCount(userId: string, moveId: string, count: number) {
        setPlayers((prev) => {
            const copy: typeof prev = JSON.parse(JSON.stringify(prev));

            const player = copy.find((i) => i.id === userId);

            if (!player) return prev;

            const move = player?.moves.find((i) => i.id === moveId);

            if (!move) return prev;

            move.count = count;

            return copy;
        });
    }

    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Match',
                    headerStyle: {
                        backgroundColor: theme.color.topNav,

                        // @ts-ignore
                        elevation: 0, // For Android
                        shadowOpacity: 0, // For iOS
                        borderBottomWidth: 0, // Removes the border for both platforms
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                    headerRight: () => (
                        <HeaderItem
                            onPress={() => {
                                // @ts-ignore
                                navigation.navigate('matches');
                            }}
                        >
                            Create
                        </HeaderItem>
                    ),
                    headerTitle: () => (
                        <MatchVsHeader
                            match={mockMatches[0]}
                            style={{
                                bottom: 4,
                            }}
                        />
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
            >
                {Feature.LIVE_MATCHES.isEnabled && (
                    <Button
                        variant="default"
                        title="Start Live Match"
                        size="small"
                        // @ts-ignore
                        onPress={() => navigation.navigate('startLiveMatch')}
                    />
                )}
                <MatchPlayers
                    editable
                    players={players}
                    setMoveCount={setMoveCount}
                />
            </ScrollView>
        </>
    );
}
