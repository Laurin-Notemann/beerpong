import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import { useGroup, useSeasonSettings } from '@/api/calls/seasonHooks';
import { IconName } from '@/components/Icon';
import InputModal from '@/components/InputModal';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import Select from '@/components/Select';
import { useNumberPrompt } from '@/hooks/useNumberPrompt';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { showErrorToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';

type Weight = 'eloK' | 'eloKr' | 'eloSwing' | 'eloSpread';

// the weights edited as numbers, each a row that asks for a new value
const WEIGHTS: {
    key: Weight;
    title: string;
    subtitle: string;
    icon: IconName;
}[] = [
    {
        key: 'eloK',
        title: 'Hitting',
        subtitle:
            "Elo for scoring an average player's full game above your share.",
        icon: 'bullseye-arrow',
    },
    {
        key: 'eloKr',
        title: 'Result',
        subtitle: 'Elo at stake on winning or losing.',
        icon: 'trophy-outline',
    },
    {
        key: 'eloSwing',
        title: 'Swing',
        subtitle: "How far ratings move per match. Doesn't change who's ahead.",
        icon: 'chart-bell-curve',
    },
    {
        key: 'eloSpread',
        title: 'Spread',
        subtitle:
            'At Swing 1, the rating gap of scoring 10 times as often. Smaller makes expected shares more different.',
        icon: 'arrow-expand-horizontal',
    },
];

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

    const { prompt, element: promptElement } = useNumberPrompt();

    // Unedited fields show the saved settings. A season cached before these
    // settings existed has none until it refetches.
    const [edited, setEdited] = useState<
        Partial<Record<Weight | 'eloRingWeight', number>>
    >({});
    const weights = {
        eloK: edited.eloK ?? seasonSettings?.eloK,
        eloKr: edited.eloKr ?? seasonSettings?.eloKr,
        eloSwing: edited.eloSwing ?? seasonSettings?.eloSwing,
        eloSpread: edited.eloSpread ?? seasonSettings?.eloSpread ?? 4000,
        eloRingWeight: edited.eloRingWeight ?? seasonSettings?.eloRingWeight,
    };
    const loaded = Object.values(weights).every((v) => v != null);
    const isDirty = Object.keys(edited).length > 0;

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
                    onPress={() => (isDirty ? save(edited) : nav.goBack())}
                >
                    Save
                </Stack.Toolbar.Button>
            </Stack.Toolbar>
            {loaded && (
                <InputModal>
                    {/* the sections are taller than the sheet: they scroll at their own height */}
                    <ScrollView
                        contentContainerStyle={{ gap: 32, paddingBottom: 32 }}
                    >
                        <MenuSection
                            noFlex
                            title="Weights"
                            footer="Every leaderboard of this season is recomputed with these, all matches included. Hitting: own points against your share of the game's points, set by the ratings before it. Result: win or loss against the win chance."
                        >
                            {WEIGHTS.map((w, i) => (
                                <MenuItem
                                    key={w.key}
                                    border={i !== 0}
                                    title={w.title}
                                    subtitle={w.subtitle}
                                    headIcon={w.icon}
                                    tailContent={weights[w.key] ?? undefined}
                                    onPress={async () => {
                                        const value = await prompt(
                                            w.title,
                                            w.subtitle,
                                            weights[w.key]!
                                        );
                                        if (value != null) {
                                            setEdited((e) => ({
                                                ...e,
                                                [w.key]: value,
                                            }));
                                        }
                                    }}
                                />
                            ))}
                        </MenuSection>
                        <Select
                            noFlex
                            title="A ring win counts"
                            items={RING_WEIGHTS}
                            value={String(weights.eloRingWeight)}
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
                                        eloSpread: null,
                                    })
                                }
                            />
                        </MenuSection>
                    </ScrollView>
                </InputModal>
            )}
            {promptElement}
        </>
    );
}
