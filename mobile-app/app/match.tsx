import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import { useMatchQuery } from '@/api/calls/matchHooks';
import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { matchDtoToMatch } from '@/api/utils/matchDtoToMatch';
import MatchPlayers from '@/components/MatchPlayers';
import MatchVsHeader from '@/components/MatchVsHeader';
import { mockMatches } from '@/components/mockData/matches';
import { theme } from '@/theme';

import { HeaderItem } from './(tabs)/_layout';

export default function Page() {
    const [isEditing, setIsEditing] = useState(false);

    const { groupId, seasonId } = useGroup();

    const playersQuery = usePlayersQuery(groupId, seasonId);

    const players = playersQuery.data?.data ?? [];

    const { id } = useLocalSearchParams<{ id: string }>();

    const matchQuery = useMatchQuery(groupId, seasonId, id);

    const match = matchQuery.data?.data
        ? matchDtoToMatch(players)(matchQuery.data.data)
        : null;

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
                        ) : null,
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
                <MatchPlayers
                    editable={isEditing}
                    players={[
                        ...(match?.blueTeam?.map((i) => ({
                            ...i,
                            team: 'blue' as const,
                        })) ?? []),
                        ...(match?.redTeam?.map((i) => ({
                            ...i,
                            team: 'red' as const,
                        })) ?? []),
                    ].map((i) => ({
                        id: '#',
                        change: 0,
                        moves: [],
                        name: i.name,
                        avatarUrl: i.avatarUrl,
                        points: 2,
                        team: i.team,
                    }))}
                    setMoveCount={setMoveCount}
                />
            </ScrollView>
        </>
    );
}
