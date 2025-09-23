import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';

import {
    usePlayersQuery,
    useUpdatePlayerMutation,
} from '@/api/calls/playerHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import { HeaderItem } from '@/components/HeaderItem';
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

    const profileId = player?.profile?.id;

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
                    headerRight: () => (
                        <HeaderItem
                            isLoading={updatePlayerMutation.isPending}
                            disabled={value.length < 1}
                            noMargin
                            onPress={onSubmit}
                        >
                            Done
                        </HeaderItem>
                    ),

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
