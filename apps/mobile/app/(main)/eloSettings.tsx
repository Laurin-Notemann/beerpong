import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import { useGroup, useSeasonSettings } from '@/api/calls/seasonHooks';
import InputModal from '@/components/InputModal';
import MenuItem from '@/components/Menu/MenuItem';
import { MenuItemNumberInput } from '@/components/Menu/MenuItemNumberInput';
import MenuSection from '@/components/Menu/MenuSection';
import Select from '@/components/Select';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { showErrorToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';

// what a ring win's result counts: (ring bonus / normal finish bonus) to this power
const RING_WEIGHTS = [
    {
        value: '0.5',
        title: 'Square root of the bonus ratio',
        subtitle: 'With bonuses of 10 and 3, about 1.8 normal wins.',
    },
    {
        value: '1',
        title: 'The bonus ratio',
        subtitle: 'With bonuses of 10 and 3, about 3.3 normal wins.',
    },
    {
        value: '0',
        title: 'Like a normal win',
        subtitle: 'The ring bonus only counts for points.',
    },
];

export default function Page() {
    const nav = useNavigation();

    const { groupId, seasonId } = useGroup();

    const { seasonSettings, updateSeasonSettingsMutation } = useSeasonSettings(
        groupId!,
        seasonId!
    );

    // Unedited fields show the saved settings. A season cached before these
    // settings existed has none until it refetches.
    const [edited, setEdited] = useState<{
        eloK?: number;
        eloKr?: number;
        eloRingWeight?: number;
        eloSwing?: number;
    }>({});
    const eloK = edited.eloK ?? seasonSettings?.eloK;
    const eloKr = edited.eloKr ?? seasonSettings?.eloKr;
    const eloRingWeight = edited.eloRingWeight ?? seasonSettings?.eloRingWeight;
    const eloSwing = edited.eloSwing ?? seasonSettings?.eloSwing;

    const isDirty =
        eloK !== seasonSettings?.eloK ||
        eloKr !== seasonSettings?.eloKr ||
        eloRingWeight !== seasonSettings?.eloRingWeight ||
        eloSwing !== seasonSettings?.eloSwing;

    async function save(
        update: Parameters<typeof updateSeasonSettingsMutation.mutateAsync>[0]
    ) {
        try {
            await updateSeasonSettingsMutation.mutateAsync(update);
            nav.goBack();
        } catch (err) {
            ConsoleLogger.error('failed to update settings:', err);
            showErrorToast('Failed to update settings.', err);
        }
    }

    return (
        <>
            <Stack.Screen options={{ headerTitle: 'Elo Weights' }} />
            <Stack.Toolbar placement="left">
                <Stack.Toolbar.Button onPress={() => nav.goBack()}>
                    Cancel
                </Stack.Toolbar.Button>
            </Stack.Toolbar>
            <Stack.Toolbar placement="right">
                <Stack.Toolbar.Button
                    variant="done"
                    disabled={updateSeasonSettingsMutation.isPending}
                    onPress={() =>
                        isDirty
                            ? save({ eloK, eloKr, eloRingWeight, eloSwing })
                            : nav.goBack()
                    }
                >
                    Save
                </Stack.Toolbar.Button>
            </Stack.Toolbar>
            {eloK != null &&
                eloKr != null &&
                eloRingWeight != null &&
                eloSwing != null && (
                    <InputModal>
                        {/* the sections are taller than the sheet: they scroll at their own height */}
                        <ScrollView
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{
                                gap: 32,
                                paddingBottom: 32,
                            }}
                        >
                            <MenuSection
                                noFlex
                                title="Weights"
                                footer="Every leaderboard of this season is recomputed with these, all matches included. Hitting: own points against your share of the game's points, set by the ratings before it. Result: win or loss against the win chance."
                            >
                                <MenuItemNumberInput
                                    border={false}
                                    title="Hitting"
                                    subtitle="Elo for scoring an average player's full game above your share."
                                    headIcon="bullseye-arrow"
                                    defaultValue={eloK}
                                    onChange={(v) =>
                                        setEdited((e) => ({ ...e, eloK: v }))
                                    }
                                />
                                <MenuItemNumberInput
                                    title="Result"
                                    subtitle="Elo at stake on winning or losing."
                                    headIcon="trophy-outline"
                                    defaultValue={eloKr}
                                    onChange={(v) =>
                                        setEdited((e) => ({ ...e, eloKr: v }))
                                    }
                                />
                                <MenuItemNumberInput
                                    title="Swing"
                                    subtitle="How far ratings move per match. Doesn't change who's ahead."
                                    headIcon="chart-bell-curve"
                                    decimal
                                    defaultValue={eloSwing}
                                    onChange={(v) =>
                                        setEdited((e) => ({
                                            ...e,
                                            eloSwing: v,
                                        }))
                                    }
                                />
                            </MenuSection>
                            <Select
                                noFlex
                                title="A ring win counts"
                                items={RING_WEIGHTS}
                                value={String(eloRingWeight)}
                                onChange={(v) =>
                                    setEdited((e) => ({
                                        ...e,
                                        eloRingWeight: Number(v),
                                    }))
                                }
                            />
                            <MenuSection noFlex>
                                <MenuItem
                                    border={false}
                                    title="Reset to Defaults"
                                    headIcon="restore"
                                    confirmationPrompt={{
                                        title: 'Reset Elo Weights',
                                        description:
                                            "This season's leaderboards go back to the default weights.",
                                        buttonText: 'Reset',
                                        type: 'confirmBlue',
                                    }}
                                    onPress={() =>
                                        save({
                                            eloK: null,
                                            eloKr: null,
                                            eloRingWeight: null,
                                            eloSwing: null,
                                        })
                                    }
                                />
                            </MenuSection>
                        </ScrollView>
                    </InputModal>
                )}
        </>
    );
}
