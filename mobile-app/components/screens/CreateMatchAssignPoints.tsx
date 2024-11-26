import { Stack } from 'expo-router';
import React from 'react';
import { ScrollView } from 'react-native';

import { TeamMember } from '@/api/utils/matchDtoToMatch';
import { navStyles } from '@/app/navigation/navStyles';
import { useNavigation } from '@/app/navigation/useNavigation';
import Button from '@/components/Button';
import { HeaderItem } from '@/components/HeaderItem';
import MatchPlayers from '@/components/MatchPlayers';
import MatchVsHeader from '@/components/MatchVsHeader';
import { Feature } from '@/constants/Features';
import { theme } from '@/theme';

export interface CreateMatchAssignPointsProps {
    players: TeamMember[];
    setMoveCount: (playerId: string, moveId: string, count: number) => void;

    onSubmit: () => void;

    onPlayerPress: (player: TeamMember) => void;
}
export default function CreateMatchAssignPoints({
    players,
    setMoveCount,
    onSubmit,
    onPlayerPress,
}: CreateMatchAssignPointsProps) {
    const navigation = useNavigation();
    return (
        <>
            <Stack.Screen
                options={{
                    ...navStyles,
                    headerRight: () => (
                        <HeaderItem onPress={onSubmit} noMargin>
                            Create
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
                        onPress={() => navigation.navigate('startLiveMatch')}
                    />
                )}
                <MatchPlayers
                    editable
                    players={players}
                    setMoveCount={setMoveCount}
                    onPlayerPress={onPlayerPress}
                />
            </ScrollView>
        </>
    );
}
