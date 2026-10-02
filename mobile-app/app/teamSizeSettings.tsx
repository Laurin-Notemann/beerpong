import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';

import { useGroup, useSeasonSettings } from '@/api/calls/seasonHooks';
import { useNavigation } from '@/app/navigation/useNavigation';
import InputModal from '@/components/InputModal';
import { MenuItemNumberInput } from '@/components/Menu/MenuItemNumberInput';
import MenuSection from '@/components/Menu/MenuSection';
import { showErrorToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';

export default function Page() {
    const nav = useNavigation();

    const { groupId, seasonId } = useGroup();

    const { seasonSettings, updateSeasonSettingsMutation } = useSeasonSettings(
        groupId!,
        seasonId!
    );

    const [minTeamSize, setMinTeamSize] = useState(seasonSettings?.minTeamSize);
    const [maxTeamSize, setMaxTeamSize] = useState(seasonSettings?.maxTeamSize);

    useEffect(() => {
        if (seasonSettings) {
            setMinTeamSize(seasonSettings.minTeamSize);
            setMaxTeamSize(seasonSettings.maxTeamSize);
        }
    }, [seasonSettings]);

    const isDirty =
        minTeamSize !== seasonSettings?.minTeamSize ||
        maxTeamSize !== seasonSettings?.maxTeamSize;

    return (
        <>
            <Stack.Screen options={{ headerTitle: 'Team Size' }} />
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
                                    minTeamSize,
                                    maxTeamSize,
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
                <MenuSection>
                    <MenuItemNumberInput
                        border={false}
                        title="Min Team Size"
                        headIcon="account-group-outline"
                        defaultValue={minTeamSize}
                        onChange={setMinTeamSize}
                    />
                    <MenuItemNumberInput
                        title="Max Team Size"
                        headIcon="account-group-outline"
                        defaultValue={maxTeamSize}
                        onChange={setMaxTeamSize}
                    />
                </MenuSection>
            </InputModal>
        </>
    );
}
