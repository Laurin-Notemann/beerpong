import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';

import { useGroup, useSeasonSettings } from '@/api/calls/seasonHooks';
import { useNavigation } from '@/app/navigation/useNavigation';
import InputModal from '@/components/InputModal';
import Select from '@/components/Select';
import Text from '@/components/Text';
import { showErrorToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';

export default function Page() {
    const nav = useNavigation();

    const [rankingAlgorithm, setRankingAlgorithm] = useState<'AVERAGE' | 'ELO'>(
        'AVERAGE'
    );

    const { groupId, seasonId } = useGroup();

    const { seasonSettings, updateSeasonSettingsMutation } = useSeasonSettings(
        groupId!,
        seasonId!
    );

    useEffect(() => {
        if (seasonSettings) {
            setRankingAlgorithm(seasonSettings.rankingAlgorithm);
        }
    }, [seasonSettings]);

    const isDirty = rankingAlgorithm !== seasonSettings?.rankingAlgorithm;

    return (
        <>
            <Stack.Screen options={{ headerTitle: 'Rank Players By' }} />
            <Stack.Toolbar placement="left">
                <Stack.Toolbar.Button onPress={() => nav.goBack()}>
                    Cancel
                </Stack.Toolbar.Button>
            </Stack.Toolbar>
            <Stack.Toolbar placement="right">
                <Stack.Toolbar.Button
                    variant="done"
                    disabled={updateSeasonSettingsMutation.isPending}
                    onPress={async () => {
                        try {
                            if (isDirty) {
                                await updateSeasonSettingsMutation.mutateAsync({
                                    rankingAlgorithm,
                                });
                            }
                            nav.goBack();
                        } catch (err) {
                            ConsoleLogger.error(
                                'failed to update settings:',
                                err
                            );
                            showErrorToast('Failed to update settings');
                        }
                    }}
                >
                    Save
                </Stack.Toolbar.Button>
            </Stack.Toolbar>
            <InputModal>
                <Select
                    items={[
                        {
                            value: 'AVERAGE',
                            title: 'Average Points Scored',
                            subtitle:
                                'Points scored divided by matches played.',
                        },
                        {
                            value: 'ELO',
                            title: 'Elo',
                            subtitle:
                                'More balanced algorithm based on relative skill level.',
                        },
                    ]}
                    value={rankingAlgorithm}
                    // @ts-expect-error damn union types
                    onChange={setRankingAlgorithm}
                    footer={
                        <Text
                            color="link"
                            onPress={() => {
                                // close the modal
                                nav.goBack();
                                nav.navigate('static/aboutTheEloAlgorithm');
                            }}
                            style={{
                                fontSize: 13,
                                lineHeight: 16,
                                fontWeight: 400,

                                paddingHorizontal: 16,
                                paddingVertical: 11,
                            }}
                        >
                            Learn more about the Elo algorithm
                        </Text>
                    }
                />
            </InputModal>
        </>
    );
}
