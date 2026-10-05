import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { usePlayersQuery } from '@/api/calls/playerHooks';
import { useMoves } from '@/api/calls/ruleHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import CupGrid from '@/components/CupGrid';
import { rotateFormation, rotatePoint } from '@/components/CupGrid/Formation';
import { OverlayIconButton } from '@/components/overlay/OverlayIconButton';
import { triggerHapticBump } from '@/haptics';
import { CUP_FORMATION, CupPosition, CupTeam, findHit } from '@/lib/cupHits';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { cupAt, cupLayout } from '@/lib/rerack';
import { useInsets } from '@/lib/useInsets';
import { useMatchEntry } from '@/lib/useMatchEntry';
import { useTheme } from '@/theme';
import { useReracks } from '@/zustand/formationStore';

const HINT_HEIGHT = 64;
const GRID_GAP = 32;
const MAX_GRID_WIDTH = 300;
/** the swap and re-rack buttons at the right edge; the grids stay clear of them */
const SIDE_BUTTONS_WIDTH = 72;

/**
 * The live match screen's cups page: both teams' cups, as on the table. Tapping a cup records
 * who hit it; tapping a hit cup puts it back. The team at the bottom is drawn turned around, facing
 * the other team, and the swap button switches which team that is. The button below it re-racks
 * a team's cups into a saved formation.
 */
export default function NewMatchCups({
    liveMatchId,
}: {
    /** the live match to enter into; without it, the local draft */
    liveMatchId?: string;
}) {
    const theme = useTheme();
    const nav = useNavigation();
    const insets = useInsets(true, true);

    const entry = useMatchEntry(liveMatchId);
    const reracks = useReracks(liveMatchId);

    const { groupId } = useGroup();
    const playersQuery = usePlayersQuery(groupId, entry.seasonId);
    const movesQuery = useMoves(groupId, entry.seasonId);

    const [bottomTeam, setBottomTeam] = useState<CupTeam>('blue');
    const topTeam: CupTeam = bottomTeam === 'blue' ? 'red' : 'blue';

    const [size, setSize] = useState({ width: 0, height: 0 });

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
        cupLayout(entry.cupHits, team, reracks?.[team]);

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

    function confirmPutBack(team: CupTeam, cup: CupPosition) {
        const hit = findHit(entry.cupHits, team, cup);
        if (!hit) return;

        const name =
            playersQuery.data?.data?.find((i) => i.id === hit.playerId)?.profile
                ?.name || 'Unknown';
        const move = movesQuery.data?.data?.find((i) => i.id === hit.moveId);
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

    function onCupTap(team: CupTeam, tapped: CupPosition) {
        const drawn =
            team === bottomTeam ? rotatePoint(CUP_FORMATION, tapped) : tapped;
        const cup = cupAt(layoutOf(team), drawn);
        if (!cup) return;
        const position = { x: cup.x, y: cup.y };

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
                        Tap a cup when it&apos;s hit. Tap a hit cup to put it
                        back.
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
                </View>
                {gridWidth > 0 && (
                    <View style={{ gap: GRID_GAP }}>
                        {[topTeam, bottomTeam].map((team) => (
                            <CupGrid
                                key={team}
                                color={theme.color.team[team]}
                                width={gridWidth}
                                formation={formationOf(team)}
                                onCupTap={(cup) => onCupTap(team, cup)}
                            />
                        ))}
                    </View>
                )}
            </View>
        </View>
    );
}
