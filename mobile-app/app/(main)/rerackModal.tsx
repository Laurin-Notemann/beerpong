import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Dimensions, ScrollView, View } from 'react-native';

import { useFormations } from '@/api/calls/formationHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { FormationTile } from '@/components/FormationTile';
import { OverlayTextButton } from '@/components/overlay/OverlayTextButton';
import Text from '@/components/Text';
import { triggerHapticBump } from '@/haptics';
import { CUP_FORMATION, CupTeam, findHit, standingCups } from '@/lib/cupHits';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { cupLayout, rerack } from '@/lib/rerack';
import { useCloseWhenEnded, useMatchEntry } from '@/lib/useMatchEntry';
import { useTheme } from '@/theme';
import { useReracks, useRerackStore } from '@/zustand/rerackStore';

const TILE_SIZE = Math.floor((Dimensions.get('window').width - 32 - 16) / 3);

/**
 * Pro mode: put a team's cups back together in a saved formation with as many cups as it has
 * left, or back in the pyramid. Opened from the cups page.
 */
export default function Page() {
    const { liveMatchId } = useLocalSearchParams<{ liveMatchId?: string }>();

    const theme = useTheme();
    const nav = useNavigation();

    const entry = useMatchEntry(liveMatchId);
    useCloseWhenEnded(entry.isEnded);

    const { groupId } = useGroup();
    const formations = useFormations(groupId).data ?? [];
    const { setRerack } = useRerackStore((s) => s.actions);
    const reracks = useReracks(liveMatchId);
    const matchKey = liveMatchId ?? 'draft';

    function pick(team: CupTeam, formationId?: string) {
        const formation = formations.find((i) => i.id === formationId);

        setRerack(
            matchKey,
            team,
            formation ? rerack(entry.cupHits, team, formation) : undefined
        );
        triggerHapticBump('selection');
        nav.goBack();
    }

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: theme.panel.dark.bg }}
            contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: 16,
                paddingBottom: 32,
                gap: 24,
            }}
        >
            <Stack.Screen options={{ headerTitle: 'Re-rack' }} />
            {(['red', 'blue'] as const).map((team) => {
                const standing = standingCups(entry.cupHits, team).length;
                const current = reracks?.[team];
                const isReracked =
                    !!current &&
                    cupLayout(entry.cupHits, team, current) === current.slots;
                const options = formations.filter(
                    (i) => i.cups.length === standing
                );
                const color = theme.color.team[team];

                return (
                    <View key={team} style={{ gap: 12 }}>
                        <Text color="primary" variant="h3">
                            {team === 'red' ? 'Red' : 'Blue'} ·{' '}
                            {standing === 1 ? '1 cup' : `${standing} cups`} left
                        </Text>
                        <View
                            style={{
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                gap: 8,
                            }}
                        >
                            <FormationTile
                                name="Pyramid"
                                size={TILE_SIZE}
                                color={color}
                                selected={!isReracked}
                                onPress={() => pick(team)}
                                formation={{
                                    ...CUP_FORMATION,
                                    cups: CUP_FORMATION.cups.map((cup) => ({
                                        ...cup,
                                        disabled: !!findHit(
                                            entry.cupHits,
                                            team,
                                            cup
                                        ),
                                    })),
                                }}
                            />
                            {options.map((i) => (
                                <FormationTile
                                    key={i.id}
                                    name={i.name}
                                    size={TILE_SIZE}
                                    color={color}
                                    selected={
                                        isReracked &&
                                        current.formationId === i.id
                                    }
                                    onPress={() => pick(team, i.id)}
                                    formation={{
                                        ...CUP_FORMATION,
                                        cups: i.cups,
                                    }}
                                />
                            ))}
                        </View>
                        {options.length === 0 && (
                            <Text color="secondary">
                                No saved formation has {standing}{' '}
                                {standing === 1 ? 'cup' : 'cups'}.
                            </Text>
                        )}
                    </View>
                );
            })}
            <View style={{ flexDirection: 'row' }}>
                <OverlayTextButton
                    fullWidth
                    title="Manage formations"
                    onPress={() => nav.navigate('formations')}
                />
            </View>
        </ScrollView>
    );
}
