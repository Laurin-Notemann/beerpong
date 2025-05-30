import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';

import { useGroup, useSeasonSettings } from '@/api/calls/seasonHooks';
import { useNavigation } from '@/app/navigation/useNavigation';
import { HeaderItem } from '@/components/HeaderItem';
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

    const [minMatchesToQualify, setMinMatchesToQualify] = useState(
        seasonSettings?.minMatchesToQualify
    );

    useEffect(() => {
        if (seasonSettings) {
            setMinMatchesToQualify(seasonSettings.minMatchesToQualify);
        }
    }, [seasonSettings]);

    const isDirty = minMatchesToQualify !== seasonSettings?.minMatchesToQualify;

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: 'Min Matches to Qualify',
                    headerLeft: () => (
                        <HeaderItem onPress={() => nav.goBack()}>
                            Cancel
                        </HeaderItem>
                    ),
                    headerRight: () => (
                        <HeaderItem
                            noMargin
                            onPress={async () => {
                                try {
                                    if (isDirty) {
                                        await updateSeasonSettingsMutation.mutateAsync(
                                            {
                                                minMatchesToQualify,
                                            }
                                        );
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
                            isLoading={updateSeasonSettingsMutation.isPending}
                        >
                            Save
                        </HeaderItem>
                    ),
                }}
            />
            <InputModal>
                <MenuSection>
                    <MenuItemNumberInput
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
