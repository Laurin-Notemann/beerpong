import { Stack } from 'expo-router';
import React, { useState } from 'react';

import { useGroup, useSeasonSettings } from '@/api/calls/seasonHooks';
import InputModal from '@/components/InputModal';
import { MenuItemNumberInput } from '@/components/Menu/MenuItemNumberInput';
import MenuSection from '@/components/Menu/MenuSection';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { showErrorToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';

export default function Page() {
    const nav = useNavigation();

    const { groupId, seasonId } = useGroup();

    const { seasonSettings, updateSeasonSettingsMutation } = useSeasonSettings(
        groupId!,
        seasonId!
    );

    const [editedMinMatchesToQualify, setMinMatchesToQualify] =
        useState<number>();

    // Unedited, this shows the saved setting.
    const minMatchesToQualify =
        editedMinMatchesToQualify ?? seasonSettings?.minMatchesToQualify;

    const isDirty = minMatchesToQualify !== seasonSettings?.minMatchesToQualify;

    return (
        <>
            <Stack.Screen options={{ headerTitle: 'Min Matches to Qualify' }} />
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
                                    minMatchesToQualify,
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
                        title="Min Matches to Qualify"
                        subtitle="Players have to play at least this many matches to show up on the leaderboard."
                        headIcon="account-lock-open"
                        defaultValue={minMatchesToQualify}
                        onChange={setMinMatchesToQualify}
                    />
                </MenuSection>
            </InputModal>
        </>
    );
}
