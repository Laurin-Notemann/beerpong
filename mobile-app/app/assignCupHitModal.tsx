import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { TeamMember } from '@/api/utils/matchDtoToMatch';
import Avatar from '@/components/Avatar';
import CupGrid from '@/components/CupGrid';
import { Formation } from '@/components/CupGrid/Formation';
import Select from '@/components/Select';
import Text from '@/components/Text';
import { theme } from '@/theme';
import { ConsoleLogger } from '@/utils/logging';
import { useMatchDraftStore } from '@/zustand/matchDraftStore';

export default function Page() {
    const isBlue = false;

    const { pageIdx: initialPageIdx } = useLocalSearchParams<{
        pageIdx: string;
    }>();

    const matchDraft = useMatchDraftStore();

    const { groupId, seasonId } = useGroup();

    const movesQuery = useMoves(groupId, seasonId);

    const allowedMoves = movesQuery.data?.data ?? [];

    const playersQuery = usePlayersQuery(groupId, seasonId);

    const profiles = playersQuery.data?.data ?? [];

    const players = matchDraft.actions.getPlayers();

    const teamMembers = players.map<TeamMember>((i) => {
        const profile = profiles.find((j) => i.playerId === j.id);

        if (!profile?.profile?.name) {
            ConsoleLogger.error('failed to get profile for team member');
        }

        return {
            id: i.playerId,
            team: i.team,
            avatarUrl: profile?.profile?.avatarAsset?.url,
            name: profile?.profile?.name || 'Unknown',
            points: i.moves.reduce(
                (sum, j) =>
                    sum +
                    j.count *
                        (allowedMoves.find((k) => k.id === j.moveId)
                            ?.pointsForScorer ?? 0),
                0
            ),
            change: 0.12,
            moves: allowedMoves.map((j) => {
                return {
                    id: j.id!,
                    count: i.moves.find((k) => k.moveId === j.id)?.count ?? 0,
                    title: j.name || 'Unknown',
                    points: j.pointsForScorer!,
                    pointsForTeam: j.pointsForTeam!,
                    isFinish: j.finishingMove!,
                };
            }),
        };
    });

    const potentialScorers = teamMembers.filter(
        (i) => i.team === (isBlue ? 'red' : 'blue')
    );

    const [player, setPlayer] = useState<TeamMember | null>(
        potentialScorers.length > 1 ? null : potentialScorers[0]
    );
    const [move, setMove] = useState<string | null>(null);

    const formation = {
        ...Formation.Pyramid_10,
        cups: Formation.Pyramid_10.cups.map((i) =>
            i.x === 0 && i.y === 0 ? { ...i } : { ...i, disabled: true }
        ),
    };

    return (
        <View
            style={{
                backgroundColor: '#1B1B1B',

                flex: 1,

                paddingHorizontal: 16,
            }}
        >
            <Stack.Screen
                options={{
                    headerTitle: 'Cup Hit',
                }}
            />
            <View style={{ alignItems: 'center' }}>
                <CupGrid
                    color={theme.color.team[isBlue ? 'blue' : 'red']}
                    width={160}
                    formation={formation}
                />
            </View>
            {potentialScorers.length > 1 && (
                <>
                    <Text color="primary" variant="h3">
                        Who scored this cup?
                    </Text>
                    <Select
                        items={potentialScorers.map((i) => ({
                            value: i.id,
                            title: i.name,
                            headIcon: (
                                <Avatar
                                    size={36}
                                    name={i.name}
                                    borderColor={
                                        i.team
                                            ? theme.color.team[i.team]
                                            : undefined
                                    }
                                    style={{
                                        marginRight: 8,
                                    }}
                                />
                            ),
                        }))}
                        onChange={(playerId) =>
                            setPlayer(
                                teamMembers.find((i) => i.id === playerId)!
                            )
                        }
                        value={player?.id}
                    />
                </>
            )}
            {player && (
                <>
                    <Text color="primary" variant="h3">
                        How did {player.name} score this cup?
                    </Text>
                    <Select
                        items={allowedMoves
                            .filter((i) => !i.finishingMove)
                            .map((i) => ({
                                value: i.id!,
                                title: i.name!,
                            }))}
                        onChange={setMove}
                        value={move}
                    />
                </>
            )}
        </View>
    );
}
// TODO: actually highlight clicked cup, keep formation in matchDraft
// TODO: overflow behaviour

// TODO: "Create" button doesn't make sense for cup mode

// we'll need an overview anyway: to keep track of people's points, and to add stuff like team photos and locations
// how can we easily just not use this if it's e.g. a kicker group?
