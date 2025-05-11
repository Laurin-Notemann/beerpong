import { Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView } from 'react-native';

import { TeamMember } from '@/api/utils/matchDtoToMatch';
import { navStyles } from '@/app/navigation/navStyles';
import { useNavigation } from '@/app/navigation/useNavigation';
import Button from '@/components/Button';
import { HeaderItem } from '@/components/HeaderItem';
import MatchPlayers from '@/components/MatchPlayers';
import MatchVsHeader from '@/components/MatchVsHeader';
import { theme } from '@/theme';
import { useLocalSettings } from '@/zustand/localSettingsStore';

export interface CreateMatchAssignPointsProps {
    isPending: boolean;
    players: TeamMember[];
    setMoveCount: (playerId: string, moveId: string, count: number) => void;

    onSubmit: () => void;
    onCancel: () => void;

    onPlayerPress: (player: TeamMember) => void;
}
export default function CreateMatchAssignPoints({
    isPending,
    players,
    setMoveCount,
    onSubmit,
    onCancel,
    onPlayerPress,
}: CreateMatchAssignPointsProps) {
    const navigation = useNavigation();
    const { experimentalImprovedMatchCreation, liveMatches } =
        useLocalSettings();

    return (
        <>
            {experimentalImprovedMatchCreation && (
                <Stack.Screen
                    options={{
                        ...navStyles,
                        headerLeft: () => (
                            <HeaderItem onPress={onCancel} noMargin>
                                Cancel
                            </HeaderItem>
                        ),
                        headerRight: () => (
                            <HeaderItem
                                onPress={onSubmit}
                                noMargin
                                disabled={isPending}
                            >
                                {isPending ? <ActivityIndicator /> : 'Create'}
                            </HeaderItem>
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
            )}
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
                {liveMatches && (
                    <Button
                        variant="default"
                        title="Start Live Match"
                        size="small"
                        onPress={() => navigation.navigate('startLiveMatch')}
                    />
                )}
                <MatchPlayers
                    editable
                    players={players}
                    setMoveCount={setMoveCount}
                    onPlayerPress={onPlayerPress}
                />
                <Button
                    variant="default"
                    title={isPending ? <ActivityIndicator /> : 'Create'}
                    size="large"
                    onPress={onSubmit}
                    disabled={isPending}
                    style={{
                        marginTop: 32,
                    }}
                />
            </ScrollView>
        </>
    );
}
