import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { usePlayersQuery, useProfilesQuery } from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { TeamMember } from '@/api/utils/matchDtoToMatch';
import { useNavigation } from '@/app/navigation/useNavigation';
import Avatar from '@/components/Avatar';
import CupGrid from '@/components/CupGrid';
import { flipFormation } from '@/components/CupGrid/Formation';
import Select from '@/components/Select';
import Text from '@/components/Text';
import { useTheme } from '@/theme';
import { ConsoleLogger } from '@/utils/logging';
import { useMatchDraftStore } from '@/zustand/matchDraftStore';

export default function Page() {
    const cupProp = useLocalSearchParams<{
        x: string;
        y: string;
        color: string;
    }>();
    const cup = {
        x: parseInt(cupProp.x),
        y: parseInt(cupProp.y),
        color: cupProp.color,
    };

    const isBlue = cup.color === '#18A0FB';

    const matchDraft = useMatchDraftStore();

    const { groupId, seasonId } = useGroup();

    const movesQuery = useMoves(groupId, seasonId);

    const allowedMoves = movesQuery.data?.data ?? [];

    const playersQuery = usePlayersQuery(groupId, seasonId);

    const playersList = playersQuery.data?.data ?? [];

    const profilesQuery = useProfilesQuery(groupId);

    const profilesList = profilesQuery.data?.data ?? [];

    const players = matchDraft.actions.getPlayers();

    const teamMembers = players.map<TeamMember>((i) => {
        const player = playersList.find((j) => i.playerId === j.id);
        const profile = profilesList.find((j) => j.id === player?.profileId);

        if (!profile?.name) {
            ConsoleLogger.error('failed to get profile for team member');
        }

        return {
            id: i.playerId,
            team: i.team,
            avatarUrl: profile?.assetIdAvatar,
            name: profile?.name || 'Unknown',
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
            profileId: profile?.id!,
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
        ? flipFormation(matchDraft.blueTeam.cups.currentFormation)
        : matchDraft.redTeam.cups.currentFormation;

    const formation = {
        ...shape,
        cups: shape.cups.map((i) =>
            i.x === cup.x && i.y === cup.y ? { ...i } : { ...i, disabled: true }
        ),
    };

    const nav = useNavigation();

    function onSelectMove(moveId: string) {
        if (!player) return;

        setMove(moveId);

        matchDraft.actions.setCupHit(cup, player.id, moveId);

        nav.goBack();
    }
    const theme = useTheme();

    return (
        <View
            style={{
                backgroundColor: theme.panel.dark.bg,

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
