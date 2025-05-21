import { useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import React, { useState } from 'react';

import { useGroup, useStartNewSeasonMutation } from '@/api/calls/seasonHooks';
import { navStyles } from '@/app/navigation/navStyles';
import { useNavigation } from '@/app/navigation/useNavigation';
import { HeaderItem } from '@/components/HeaderItem';
import InputModal from '@/components/InputModal';
import Podium from '@/components/Podium';
import TextInput from '@/components/TextInput';
import { showErrorToast, showSuccessToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';

export default function Page() {
    const [value, setValue] = useState('');

    const nav = useNavigation();

    const { groupId } = useGroup();

    const newSeasonMutation = useStartNewSeasonMutation();

    const qc = useQueryClient();

    async function onStartNewSeason(oldSeasonName: string) {
        if (!groupId) return;
        try {
            await newSeasonMutation.mutateAsync({
                groupId,
                oldSeasonName,
            });
            qc.invalidateQueries({
                queryKey: ['groups', groupId],
                exact: false,
            });
            nav.navigate('index');
            showSuccessToast(
                `Saved current leaderboard as "${oldSeasonName}".`
            );
        } catch (err) {
            ConsoleLogger.error('failed to start new season:', err);
            showErrorToast('Failed to create start new season.');
        }
    }

    return (
        <>
            <Stack.Screen
                options={{
                    ...navStyles,
                    headerTitle: 'Save old Season',
                    headerRight: () => (
                        <HeaderItem
                            disabled={value.length < 1}
                            isLoading={newSeasonMutation.isPending}
                            onPress={() => onStartNewSeason(value)}
                        >
                            Save
                        </HeaderItem>
                    ),
                }}
            />
            <InputModal>
                <Podium detailed={false} style={{ marginHorizontal: 'auto' }} />
                <TextInput
                    required
                    placeholder="Season Name"
                    defaultValue={value}
                    onChangeText={(text) => setValue(text.trim())}
                    autoFocus
                    style={{
                        alignSelf: 'stretch',
                    }}
                />
            </InputModal>
        </>
    );
}
