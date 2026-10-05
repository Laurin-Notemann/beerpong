import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { cupsPerHit } from '@/api/utils/ruleMoveCups';
import Avatar from '@/components/Avatar';
import CupGrid from '@/components/CupGrid';
import { rotateFormation, rotatePoint } from '@/components/CupGrid/Formation';
import Select from '@/components/Select';
import Text from '@/components/Text';
import {
    CUP_FORMATION,
    CupMove,
    CupPosition,
    cupsTakenBy,
    CupTeam,
    finishesOnTopOfLastCup,
    finishForHit,
    hittableMoves,
    picksOtherCups,
    ringCompletion,
    ringLeftBy,
    standingCups,
} from '@/lib/cupHits';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { cupAt, cupLayout } from '@/lib/rerack';
import { useCloseWhenEnded, useMatchEntry } from '@/lib/useMatchEntry';
import { useTheme } from '@/theme';
import { draftPlayers } from '@/zustand/matchEditDraftStore';

/** Pro mode: who hit the tapped cup, and how. Opened from the live match's cups page. */
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
    useCloseWhenEnded(entry.isEnded);
    const layout = cupLayout(entry.cupHits, team, entry.reracks[team]);

    const { groupId } = useGroup();
    const movesQuery = useMoves(groupId, entry.seasonId);
    const playersQuery = usePlayersQuery(groupId, entry.seasonId);

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
    const moveOptions = hittableMoves(moves, standing, cup, hasFinish);
    const finishOptions = finishesOnTopOfLastCup(moves);

    const [playerId, setPlayerId] = useState<string | null>(
        scorers.length === 1 ? scorers[0].id : null
    );
    const player = scorers.find((i) => i.id === playerId);

    // a hit on the last cup that still needs to know which finish it was
    const [lastCupMove, setLastCupMove] = useState<CupMove | null>(null);
    // a hit that takes more cups than the tapped one (a bouncer), and the other cups picked so far
    const [pickMove, setPickMove] = useState<(typeof moves)[number] | null>(
        null
    );
    const [picked, setPicked] = useState<CupPosition[]>([]);
    // the cups picked leave a ring's shape: whether the hit threw the ring too
    const [ringLeft, setRingLeft] = useState<(typeof moves)[number] | null>(
        null
    );

    const isSame = (a: CupPosition, b: CupPosition) =>
        a.x === b.x && a.y === b.y;

    function record(
        move: CupMove,
        finishMoveId?: string,
        others: CupPosition[] = []
    ) {
        const cups = cupsTakenBy(entry.cupHits, team, cup, move, others);

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

        setLastCupMove(null);
        setPickMove(null);
        setPicked([]);
        setRingLeft(null);

        // this cup completes the ring's shape: its hit and the ring go in together
        const completion =
            move.isFinish && ringCompletion(moves, move, standing, cup);
        if (completion) {
            if (player) {
                entry.actions.recordCupHit({
                    team,
                    playerId: player.id,
                    ...completion,
                });
            }
            nav.goBack();
            return;
        }

        if (picksOtherCups(move, standing.length)) {
            setPickMove(move);
            return;
        }

        const finish = finishForHit(move, standing.length, hasFinish, moves);

        if (finish === 'ask') {
            setLastCupMove(move);
        } else {
            record(move, finish.finishMoveId);
        }
    }

    function onCupTap(drawn: CupPosition) {
        if (!pickMove) return;

        const tapped = cupAt(
            layout,
            params.rotated === 'true'
                ? rotatePoint(CUP_FORMATION, drawn)
                : drawn
        );
        if (!tapped) return;
        const position = { x: tapped.x, y: tapped.y };

        if (
            isSame(position, cup) ||
            !standing.some((i) => isSame(i, position))
        ) {
            return;
        }

        const next = picked.some((i) => isSame(i, position))
            ? picked.filter((i) => !isSame(i, position))
            : [...picked, position];

        if (next.length > pickMove.cups - 1) return;

        const ring =
            next.length === pickMove.cups - 1
                ? ringLeftBy(moves, standing, [cup, ...next], hasFinish)
                : undefined;

        if (next.length === pickMove.cups - 1 && !ring) {
            record(pickMove, undefined, next);
        } else {
            setPicked(next);
            setRingLeft(ring ?? null);
        }
    }

    /** the picked hit, and the ring with it taking the cups that are left */
    function recordWithRing(move: CupMove, ring: CupMove) {
        const cups = cupsTakenBy(entry.cupHits, team, cup, move, picked);

        if (player && cups) {
            entry.actions.recordCupHit({
                team,
                playerId: player.id,
                moveId: move.id,
                cups: [
                    ...cups,
                    ...standing.filter((i) => !cups.some((j) => isSame(i, j))),
                ],
                finishMoveId: ring.id,
            });
        }
        nav.goBack();
    }

    // the team's cups as they're drawn on the cups page, the tapped (and picked) ones stand out
    const formation = {
        ...CUP_FORMATION,
        cups: layout.map(({ drawn, cup: i }) => {
            const isTapped = isSame(i, cup) || picked.some((j) => isSame(i, j));
            const isStanding = standing.some((j) => j.x === i.x && j.y === i.y);

            return {
                ...drawn,
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
                    // big enough to tap while the scorer picks the other cups
                    width={pickMove ? 240 : 160}
                    onCupTap={onCupTap}
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
                            setPickMove(null);
                            setPicked([]);
                            setRingLeft(null);
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
                        value={lastCupMove?.id ?? pickMove?.id}
                    />
                </>
            )}
            {isStanding && player && pickMove && !ringLeft && (
                <Text color="primary" variant="h3">
                    {pickMove.cups === 2
                        ? 'Which other cup does it take? Tap it above.'
                        : `Which ${pickMove.cups - 1} other cups does it take? Tap them above.`}
                </Text>
            )}
            {isStanding && player && pickMove && ringLeft && (
                <>
                    <Text color="primary" variant="h3">
                        The cups left make a ring. Did the {pickMove.name}{' '}
                        trigger it?
                    </Text>
                    <Select
                        items={[
                            { value: ringLeft.id, title: ringLeft.name },
                            { value: '', title: 'No' },
                        ]}
                        onChange={(ringId) =>
                            ringId
                                ? recordWithRing(pickMove, ringLeft)
                                : record(pickMove, undefined, picked)
                        }
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
