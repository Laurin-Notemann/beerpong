import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { TeamMember } from '@/api/utils/matchDtoToMatch';
import Avatar from '@/components/Avatar';
import CupGrid from '@/components/CupGrid';
import { flipFormation, Formation } from '@/components/CupGrid/Formation';
import Select from '@/components/Select';
import Text from '@/components/Text';
import { theme } from '@/theme';
import { ConsoleLogger } from '@/utils/logging';
import { useMatchDraftStore } from '@/zustand/matchDraftStore';

import { useNavigation } from './navigation/useNavigation';

export default function Page() {
    const cup = useLocalSearchParams<{
        x: string;
        y: string;
        color: string;
    }>();

    const isBlue = cup.color === '#18A0FB';

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

    const shape = isBlue
        ? flipFormation(Formation.Pyramid_10)
        : Formation.Pyramid_10;

    const formation = {
        ...shape,
        cups: shape.cups.map((i) =>
            i.x === parseInt(cup.x) && i.y === parseInt(cup.y)
                ? { ...i }
                : { ...i, disabled: true }
        ),
    };

    const nav = useNavigation();

    function onSelectMove(moveId: string) {
        setMove(moveId);

        nav.goBack();
    }

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
                        onChange={onSelectMove}
                        value={move}
                    />
                </>
            )}
        </View>
    );
}
// TODO: keep formation in matchDraft, show removed cups in formation
// TODO: overflow behaviour in modal

// TODO: "Create" button doesn't make sense for cup mode

// we'll need an overview anyway: to keep track of people's points, and to add stuff like team photos and locations
// how can we easily just not use this if it's e.g. a kicker group?
