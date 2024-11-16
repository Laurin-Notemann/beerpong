import { Stack, useNavigation } from 'expo-router';
import React from 'react';
import { ScrollView } from 'react-native';

import { HeaderItem } from '@/app/(tabs)/_layout';
import Button from '@/components/Button';
import MatchPlayers, { TeamMember } from '@/components/MatchPlayers';
import MatchVsHeader from '@/components/MatchVsHeader';
import { Feature } from '@/constants/Features';
import { theme } from '@/theme';

export interface CreateMatchAssignPointsProps {
    players: TeamMember[];
    setMoveCount: (playerId: string, moveId: string, count: number) => void;

    onCreate: () => void;
}
export default function CreateMatchAssignPoints({
    players,
    setMoveCount,
    onCreate,
}: CreateMatchAssignPointsProps) {
    const navigation = useNavigation();
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
                        <HeaderItem onPress={onCreate}>Create</HeaderItem>
                    ),
                    headerTitle: () => (
                        <MatchVsHeader
                            match={{
                                blueCups: players
                                    .filter((i) => i.team === 'blue')
                                    .map((i) => i.moves)
                                    .flat()
                                    .reduce((sum, i) => sum + i.count, 0),
                                redCups: players
                                    .filter((i) => i.team === 'red')
                                    .map((i) => i.moves)
                                    .flat()
                                    .reduce((sum, i) => sum + i.count, 0),
                                redTeam: players.filter(
                                    (i) => i.team === 'red'
                                ),
                                blueTeam: players.filter(
                                    (i) => i.team === 'blue'
                                ),
                            }}
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
