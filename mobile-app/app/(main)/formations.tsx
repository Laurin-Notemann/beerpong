import { Stack } from 'expo-router';
import React from 'react';
import { Dimensions, Platform, ScrollView, Text, View } from 'react-native';

import { useFormations } from '@/api/calls/formationHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { FormationTile } from '@/components/FormationTile';
import { CUP_FORMATION } from '@/lib/cupHits';
import { useNavStyles } from '@/lib/navigation/navStyles';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { useAndroidIcon } from '@/lib/useAndroidIcon';
import { useInsets } from '@/lib/useInsets';
import { useTheme } from '@/theme';

const TILE_SIZE = Math.floor((Dimensions.get('window').width - 32 - 16) / 3);

/** The group's formations, to re-rack a team's cups into during a match. */
export default function Formations() {
    const insets = useInsets(true);
    const theme = useTheme();
    const nav = useNavigation();

    const { groupId } = useGroup();
    const formations = useFormations(groupId).data ?? [];
    const androidPlus = useAndroidIcon('plus', theme.color.text.primary);
    const plusIcon = Platform.OS === 'ios' ? 'plus' : androidPlus;

    return (
        <>
            <Stack.Screen
                options={{
                    ...useNavStyles(),
                    headerTitle: 'Formations',
                }}
            />
            {plusIcon && (
                <Stack.Toolbar placement="right">
                    <Stack.Toolbar.Button
                        icon={plusIcon}
                        accessibilityLabel="New formation"
                        onPress={() => nav.navigate('editFormation', {})}
                    />
                </Stack.Toolbar>
            )}
            <ScrollView
                style={{ flex: 1, backgroundColor: theme.color.bg }}
                contentContainerStyle={{
                    paddingTop: insets.top + 16,
                    paddingBottom: insets.bottom + 16,
                    paddingHorizontal: 16,
                    gap: 16,
                }}
            >
                <Text
                    style={{
                        color: theme.color.text.secondary,
                        fontSize: 13,
                    }}
                >
                    Everyone in the group shares these. During a match, re-rack
                    a team&apos;s cups into a formation with as many cups as it
                    has left.
                </Text>
                <View
                    style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
                >
                    {formations.map((i) => (
                        <FormationTile
                            key={i.id}
                            name={`${i.name} (${i.cups.length})`}
                            size={TILE_SIZE}
                            formation={{ ...CUP_FORMATION, cups: i.cups }}
                            onPress={() =>
                                nav.navigate('editFormation', { id: i.id })
                            }
                        />
                    ))}
                </View>
            </ScrollView>
        </>
    );
}
