import { MenuView } from '@expo/ui/community/menu';
import React, { useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { cupsPerHit } from '@/api/utils/ruleMoveCups';
import CupGrid, { CupHoldEvent } from '@/components/CupGrid';
import { rotateFormation, rotatePoint } from '@/components/CupGrid/Formation';
import { CupHoldMenu, pickedPlayer } from '@/components/CupHoldMenu';
import { OverlayIconButton } from '@/components/overlay/OverlayIconButton';
import { triggerHapticBump } from '@/haptics';
import {
    CUP_FORMATION,
    CupPosition,
    CupTeam,
    findHit,
    hasFinish,
    quickHit,
} from '@/lib/cupHits';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { cupAt, cupLayout } from '@/lib/rerack';
import { useInsets } from '@/lib/useInsets';
import { useMatchEntry } from '@/lib/useMatchEntry';
import { useTheme } from '@/theme';
import { showSuccessToast } from '@/toast';
import { useLocalSettingsStore } from '@/zustand/localSettingsStore';
import { draftPlayers } from '@/zustand/matchEditDraftStore';

const HINT_HEIGHT = 64;
const GRID_GAP = 32;
const MAX_GRID_WIDTH = 300;
/** the swap and re-rack buttons at the right edge; the grids stay clear of them */
const SIDE_BUTTONS_WIDTH = 72;

/**
 * The live match screen's cups page: both teams' cups, as on the table. Tapping a cup records
 * who hit it; tapping a hit cup puts it back. Holding a cup is the quick way: the players who can
 * hit it show up around it, and dragging to one records the season's default move for them
 * (or opens the cup hit modal with them picked, if there's no default or it has questions).
 * The team at the bottom is drawn turned around, facing the other team, and the swap button
 * switches which team that is. The button below it re-racks a team's cups into a saved
 * formation. With Track Misses on, a live match also gets a Miss button: a menu of the players,
 * and taking back the latest miss. Undo takes back the latest cup hit.
 */
export default function NewMatchCups({
    liveMatchId,
    onHoldingChange,
}: {
    /** the live match to enter into; without it, the local draft */
    liveMatchId?: string;
    /** while a cup is held, so the pages don't swipe under the drag */
    onHoldingChange?: (isHolding: boolean) => void;
}) {
    const theme = useTheme();
    const nav = useNavigation();
    const insets = useInsets(true, true);

    const entry = useMatchEntry(liveMatchId);

    const { groupId } = useGroup();
    const playersQuery = usePlayersQuery(groupId, entry.seasonId);
    const movesQuery = useMoves(groupId, entry.seasonId);

    const [bottomTeam, setBottomTeam] = useState<CupTeam>('blue');
    const topTeam: CupTeam = bottomTeam === 'blue' ? 'red' : 'blue';

    const [size, setSize] = useState({ width: 0, height: 0 });

    const trackMisses =
        useLocalSettingsStore((s) => s.trackMisses) && !!liveMatchId;

    // fit both pyramids on screen: a 7x7 grid is about 0.9 times as high as it is wide
    const gridWidth = Math.max(
        0,
        Math.min(
            MAX_GRID_WIDTH,
            size.width - 2 * SIDE_BUTTONS_WIDTH,
            (size.height - HINT_HEIGHT - GRID_GAP) / 2 / 0.9
        )
    );

    const layoutOf = (team: CupTeam) =>
        cupLayout(entry.cupHits, team, entry.reracks[team]);

    function formationOf(team: CupTeam) {
        const formation = {
            ...CUP_FORMATION,
            cups: layoutOf(team).map((i) => ({
                ...i.drawn,
                disabled: !!findHit(entry.cupHits, team, i.cup),
            })),
        };
        return team === bottomTeam ? rotateFormation(formation) : formation;
    }

    const profileOf = (playerId: string) =>
        playersQuery.data?.data?.find((i) => i.id === playerId)?.profile;
    const nameOf = (playerId: string) => profileOf(playerId)?.name || 'Unknown';

    const moves = movesQuery.data?.data ?? [];
    const cupMoves = moves.map((i) => ({
        id: i.id!,
        cups: cupsPerHit(i),
        isFinish: !!i.finishingMove,
    }));
    const defaultMove = cupMoves.find(
        (i) => !i.isFinish && moves.find((j) => j.id === i.id)?.defaultMove
    );

    /** the players who can hit the team's cups: the other team */
    const scorersOf = (team: CupTeam) =>
        entry[team === 'red' ? 'blueTeam' : 'redTeam'].teamMembers.map(
            ({ playerId }) => ({
                id: playerId,
                name: nameOf(playerId),
                avatarUrl: profileOf(playerId)?.avatarUrl,
            })
        );

    const [hold, setHold] = useState<{
        team: CupTeam;
        cup: CupPosition;
        center: { x: number; y: number };
        picked?: number;
    } | null>(null);
    // the hold's events come faster than renders
    const holdRef = useRef(hold);
    function updateHold(next: typeof hold) {
        holdRef.current = next;
        setHold(next);
    }

    function onCupHold(team: CupTeam, e: CupHoldEvent) {
        const current = holdRef.current;

        if (e.phase === 'start') {
            const cup = cupOf(team, e.cup);
            if (!cup || findHit(entry.cupHits, team, cup)) return;
            if (!scorersOf(team).length) return;

            updateHold({ team, cup, center: e.center });
            onHoldingChange?.(true);
            triggerHapticBump('light');
            return;
        }
        if (!current || current.team !== team) return;

        const picked = pickedPlayer(scorersOf(team).length, e.dx, e.dy);
        if (e.phase === 'move') {
            if (picked === current.picked) return;
            updateHold({ ...current, picked });
            if (picked !== undefined) triggerHapticBump('selection');
            return;
        }

        updateHold(null);
        onHoldingChange?.(false);
        const scorer =
            picked === undefined ? undefined : scorersOf(team)[picked];
        if (e.phase === 'end' && scorer) {
            recordQuickHit(team, current.cup, scorer.id);
        }
    }

    function recordQuickHit(team: CupTeam, cup: CupPosition, playerId: string) {
        const hit =
            defaultMove &&
            quickHit(
                entry.cupHits,
                team,
                cup,
                defaultMove,
                hasFinish(draftPlayers(entry), cupMoves),
                cupMoves
            );
        if (defaultMove && hit) {
            entry.actions.recordCupHit({
                team,
                playerId,
                moveId: defaultMove.id,
                ...hit,
            });
            triggerHapticBump('toast:success');
            return;
        }
        triggerHapticBump('selection');
        nav.navigate('assignCupHitModal', {
            team,
            ...cup,
            rotated: team === bottomTeam,
            liveMatchId,
            playerId,
            moveId: defaultMove?.id,
        });
    }

    const lastHit = entry.cupHits.at(-1);
    function undoLastHit() {
        if (!lastHit) return;

        entry.actions.undoCupHit(lastHit.team, lastHit.cups[0]);
        triggerHapticBump('selection');
        const move = moves.find((i) => i.id === lastHit.moveId);
        showSuccessToast(
            `Took back ${nameOf(lastHit.playerId)}'s ${move?.name ?? 'hit'}.`
        );
    }

    const lastMiss = entry.misses.at(-1);
    const missActions = [
        ...(['red', 'blue'] as const).map((team) => ({
            id: team,
            title: team === 'red' ? 'Red' : 'Blue',
            displayInline: true,
            subactions: entry[
                team === 'red' ? 'redTeam' : 'blueTeam'
            ].teamMembers.map(({ playerId }) => {
                const misses = entry.misses.filter(
                    (i) => i.playerId === playerId
                ).length;
                return {
                    id: 'miss:' + playerId,
                    title: nameOf(playerId) + (misses ? ` (${misses})` : ''),
                };
            }),
        })),
        ...(lastMiss
            ? [
                  {
                      id: 'undo:' + lastMiss.playerId,
                      title: `Take Back ${nameOf(lastMiss.playerId)}'s Miss`,
                      image: 'arrow.uturn.backward' as const,
                      attributes: { destructive: true },
                  },
              ]
            : []),
    ];

    function onMissAction(event: string) {
        const [kind, playerId] = event.split(':');
        if (!playerId) return;

        triggerHapticBump('selection');
        if (kind === 'miss') entry.actions.recordMiss(playerId);
        else if (kind === 'undo') entry.actions.undoMiss(playerId);
    }

    function confirmPutBack(team: CupTeam, cup: CupPosition) {
        const hit = findHit(entry.cupHits, team, cup);
        if (!hit) return;

        const name = nameOf(hit.playerId);
        const move = moves.find((i) => i.id === hit.moveId);
        const cups = hit.cups.length;

        Alert.alert(
            'Put the cup back?',
            `This takes back ${name}'s ${move?.name ?? 'hit'}` +
                (cups > 1 ? ` (${cups} cups)` : '') +
                (hit.finishMoveId ? ' and the finish.' : '.'),
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Put Back',
                    style: 'destructive',
                    onPress: () => {
                        entry.actions.undoCupHit(team, cup);
                        triggerHapticBump('selection');
                    },
                },
            ]
        );
    }

    /** the cup at a position as the grid draws it */
    function cupOf(team: CupTeam, drawn: CupPosition) {
        const cup = cupAt(
            layoutOf(team),
            team === bottomTeam ? rotatePoint(CUP_FORMATION, drawn) : drawn
        );
        return cup && { x: cup.x, y: cup.y };
    }

    function onCupTap(team: CupTeam, tapped: CupPosition) {
        const position = cupOf(team, tapped);
        if (!position) return;

        triggerHapticBump('selection');

        if (findHit(entry.cupHits, team, position)) {
            confirmPutBack(team, position);
            return;
        }
        nav.navigate('assignCupHitModal', {
            team,
            ...position,
            rotated: team === bottomTeam,
            liveMatchId,
        });
    }

    return (
        <View
            style={{
                flex: 1,
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
            }}
        >
            <View
                style={{ flex: 1, alignItems: 'center' }}
                onLayout={(e) => setSize(e.nativeEvent.layout)}
            >
                <View
                    style={{
                        height: HINT_HEIGHT,
                        alignSelf: 'stretch',
                        justifyContent: 'center',
                        paddingLeft: 16,
                        paddingRight: SIDE_BUTTONS_WIDTH,
                    }}
                >
                    <Text
                        style={{
                            color: theme.color.text.secondary,
                            fontSize: 13,
                        }}
                    >
                        Tap a cup when it&apos;s hit, or hold it and drag to the
                        scorer. Tap a hit cup to put it back.
                    </Text>
                </View>
                <View
                    style={{
                        position: 'absolute',
                        top: (HINT_HEIGHT - 48) / 2,
                        right: 16,
                        gap: 12,
                        zIndex: 1,
                    }}
                >
                    <OverlayIconButton
                        iconName="swap-vertical"
                        onPress={() => {
                            setBottomTeam(topTeam);
                            triggerHapticBump('selection');
                        }}
                    />
                    <OverlayIconButton
                        iconName="triangle-outline"
                        onPress={() => {
                            triggerHapticBump('selection');
                            nav.navigate('rerackModal', { liveMatchId });
                        }}
                    />
                    {trackMisses && (
                        <MenuView
                            title="Who Missed?"
                            actions={missActions}
                            onPressAction={({ nativeEvent }) =>
                                onMissAction(nativeEvent.event)
                            }
                        >
                            <View
                                pointerEvents="none"
                                accessibilityLabel="Miss"
                            >
                                <OverlayIconButton iconName="close-circle-outline" />
                            </View>
                        </MenuView>
                    )}
                    {lastHit && (
                        <OverlayIconButton
                            iconName="undo"
                            onPress={undoLastHit}
                        />
                    )}
                </View>
                {gridWidth > 0 && (
                    <View style={{ gap: GRID_GAP }}>
                        {[topTeam, bottomTeam].map((team) => (
                            // the held grid's menu goes over the other grid
                            <View
                                key={team}
                                style={{ zIndex: hold?.team === team ? 1 : 0 }}
                            >
                                <CupGrid
                                    color={theme.color.team[team]}
                                    width={gridWidth}
                                    formation={formationOf(team)}
                                    onCupTap={(cup) => onCupTap(team, cup)}
                                    onCupHold={(e) => onCupHold(team, e)}
                                >
                                    {hold?.team === team && (
                                        <CupHoldMenu
                                            center={hold.center}
                                            players={scorersOf(team)}
                                            picked={hold.picked}
                                            color={
                                                theme.color.team[
                                                    team === 'red'
                                                        ? 'blue'
                                                        : 'red'
                                                ]
                                            }
                                        />
                                    )}
                                </CupGrid>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        </View>
    );
}
