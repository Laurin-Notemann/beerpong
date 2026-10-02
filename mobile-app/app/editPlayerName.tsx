import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';

import {
    usePlayersQuery,
    useUpdatePlayerMutation,
} from '@/api/calls/playerHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import InputModal from '@/components/InputModal';
import TextInput from '@/components/TextInput';
import { useTheme } from '@/theme';
import { showErrorToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';

export default function Page() {
    const { groupId, seasonId } = useGroup();
    const router = useRouter();

    const playersQuery = usePlayersQuery(groupId, seasonId);

    const { id } = useLocalSearchParams<{ id: string }>();

    const player = playersQuery.data?.data?.find((i) => i.id === id);

    const profileId = player?.profileId;

    const [value, setValue] = useState(player?.profile?.name || '');

    const updatePlayerMutation = useUpdatePlayerMutation();

    const theme = useTheme();

    async function onSubmit() {
        if (!groupId || !seasonId || !profileId) return;

        try {
            await updatePlayerMutation.mutateAsync({
                groupId,
                seasonId,
                id: profileId,
                name: value,
            });
            router.back();
        } catch (err) {
            ConsoleLogger.error('failed to update player:', err);
            showErrorToast('Failed to update player.');
        }
    }

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: 'Player Name',
                    headerBackVisible: true,
                    headerTintColor: theme.color.text.primary,

                    headerStyle: {
                        backgroundColor: theme.panel.dark.bg,
                    },
                    headerTitleStyle: {
                        color: theme.color.text.primary,
                    },
                }}
            />
            <Stack.Toolbar placement="right">
                <Stack.Toolbar.Button
                    variant="done"
                    disabled={
                        value.length < 1 || updatePlayerMutation.isPending
                    }
                    onPress={onSubmit}
                >
                    Done
                </Stack.Toolbar.Button>
            </Stack.Toolbar>
            <InputModal>
                <TextInput
                    required
                    placeholder="Player Name"
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
