import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { cupsPerHit } from '@/api/utils/ruleMoveCups';
import Avatar from '@/components/Avatar';
import CupGrid from '@/components/CupGrid';
import { rotateFormation } from '@/components/CupGrid/Formation';
import Select from '@/components/Select';
import Text from '@/components/Text';
import {
    CUP_FORMATION,
    CupMove,
    cupsTakenBy,
    CupTeam,
    finishesOnTopOfLastCup,
    finishForHit,
    hittableMoves,
    standingCups,
} from '@/lib/cupHits';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { useMatchEntry } from '@/lib/useMatchEntry';
import { useTheme } from '@/theme';
import { draftPlayers } from '@/zustand/matchEditDraftStore';

/** Pro mode: who hit the tapped cup, and how. Opened from the cups page of a new match. */
export default function Page() {
    const params = useLocalSearchParams<{
        team: CupTeam;
        x: string;
        y: string;
        /** the team's cups are drawn turned around on the cups page */
        rotated: string;
        /** the live match being entered; without it, the local draft */
        liveMatchId?: string;
    }>();
    const team = params.team;
    const cup = { x: parseInt(params.x), y: parseInt(params.y) };

    const theme = useTheme();
    const nav = useNavigation();

    const entry = useMatchEntry(params.liveMatchId);

    const { groupId, seasonId } = useGroup();
    const movesQuery = useMoves(groupId, seasonId);
    const playersQuery = usePlayersQuery(groupId, seasonId);

    const profiles = playersQuery.data?.data ?? [];
    const moves = (movesQuery.data?.data ?? []).map<CupMove & { name: string }>(
        (i) => ({
            id: i.id!,
            name: i.name || 'Unknown',
            cups: cupsPerHit(i),
            isFinish: !!i.finishingMove,
        })
    );

    const players = draftPlayers(entry);
    // you can only hit the other team's cups
    const scorers = players
        .filter((i) => i.team !== team)
        .map((i) => ({
            id: i.playerId,
            team: i.team,
            name:
                profiles.find((j) => j.id === i.playerId)?.profile?.name ||
                'Unknown',
        }));

    const hasFinish = players.some((player) =>
        player.moves.some(
            (move) =>
                move.count > 0 &&
                moves.find((i) => i.id === move.moveId)?.isFinish
        )
    );

    const standing = standingCups(entry.cupHits, team);
    const isStanding = standing.some((i) => i.x === cup.x && i.y === cup.y);
    const moveOptions = hittableMoves(moves, standing.length, hasFinish);
    const finishOptions = finishesOnTopOfLastCup(moves);

    const [playerId, setPlayerId] = useState<string | null>(
        scorers.length === 1 ? scorers[0].id : null
    );
    const player = scorers.find((i) => i.id === playerId);

    // a hit on the last cup that still needs to know which finish it was
    const [lastCupMove, setLastCupMove] = useState<CupMove | null>(null);

    function record(move: CupMove, finishMoveId?: string) {
        const cups = cupsTakenBy(entry.cupHits, team, cup, move);

        if (player && cups) {
            entry.actions.recordCupHit({
                team,
                playerId: player.id,
                moveId: move.id,
                cups,
                finishMoveId,
            });
        }
        nav.goBack();
    }

    function onSelectMove(moveId: string) {
        const move = moveOptions.find((i) => i.id === moveId);
        if (!move) return;

        const finish = finishForHit(move, standing.length, hasFinish, moves);

        if (finish === 'ask') {
            setLastCupMove(move);
        } else {
            record(move, finish.finishMoveId);
        }
    }

    // the team's cups as they're drawn on the cups page, the tapped one stands out
    const formation = {
        ...CUP_FORMATION,
        cups: CUP_FORMATION.cups.map((i) => {
            const isTapped = i.x === cup.x && i.y === cup.y;
            const isStanding = standing.some((j) => j.x === i.x && j.y === i.y);

            return {
                ...i,
                disabled: !isStanding,
                // 8-digit hex: the team color at 40% opacity
                color: isTapped ? undefined : theme.color.team[team] + '66',
            };
        }),
    };

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: theme.panel.dark.bg }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        >
            <Stack.Screen options={{ headerTitle: 'Cup Hit' }} />
            <View style={{ alignItems: 'center', marginVertical: 16 }}>
                <CupGrid
                    color={theme.color.team[team]}
                    width={160}
                    formation={
                        params.rotated === 'true'
                            ? rotateFormation(formation)
                            : formation
                    }
                />
            </View>
            {!isStanding && (
                <Text color="secondary">
                    This cup is already off the table.
                </Text>
            )}
            {isStanding && scorers.length === 0 && (
                <Text color="secondary">
                    Add players to the other team to record who hit this cup.
                </Text>
            )}
            {isStanding && scorers.length > 1 && (
                <>
                    <Text color="primary" variant="h3">
                        Who hit this cup?
                    </Text>
                    <Select
                        items={scorers.map((i) => ({
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
                                    style={{ marginRight: 8 }}
                                />
                            ),
                        }))}
                        onChange={(id) => {
                            setPlayerId(id);
                            setLastCupMove(null);
                        }}
                        value={playerId}
                    />
                </>
            )}
            {isStanding && player && (
                <>
                    <Text color="primary" variant="h3">
                        How did {player.name} hit it?
                    </Text>
                    <Select
                        items={moveOptions.map((i) => ({
                            value: i.id,
                            title:
                                i.cups > 1
                                    ? `${i.name} (${i.cups} cups)`
                                    : i.name,
                        }))}
                        onChange={onSelectMove}
                        value={lastCupMove?.id}
                    />
                </>
            )}
            {isStanding && player && lastCupMove && (
                <>
                    <Text color="primary" variant="h3">
                        That&apos;s the last cup. How did {player.name} finish?
                    </Text>
                    <Select
                        items={finishOptions.map((i) => ({
                            value: i.id,
                            title: i.name,
                        }))}
                        onChange={(finishMoveId) =>
                            record(lastCupMove, finishMoveId)
                        }
                    />
                </>
            )}
        </ScrollView>
    );
}
