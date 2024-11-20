import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';

import {
    usePlayersQuery,
    useUpdatePlayerMutation,
} from '@/api/calls/playerHooks';
import { useGroup } from '@/api/calls/seasonHooks';
import InputModal from '@/components/InputModal';
import TextInput from '@/components/TextInput';
import { theme } from '@/theme';
import { showErrorToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';

import { HeaderItem } from './(tabs)/HeaderItem';
import { useNavigation } from './navigation/useNavigation';

export default function Page() {
    const nav = useNavigation();

    const { groupId, seasonId } = useGroup();

    const playersQuery = usePlayersQuery(groupId, seasonId);

    const { id } = useLocalSearchParams<{ id: string }>();

    const player = playersQuery.data?.data?.find((i) => i.id === id);

    const profileId = player?.profile?.id;

    const [value, setValue] = useState(player?.profile?.name || '');

    const { mutateAsync } = useUpdatePlayerMutation();

    async function onSubmit() {
        if (!groupId || !seasonId || !profileId) return;

        try {
            await mutateAsync({
                groupId,
                seasonId,
                id: profileId,
                name: value,
            });
            nav.navigate('index');
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
                            disabled={value.length < 1}
                            noMargin
                            onPress={onSubmit}
                        >
                            Done
                        </HeaderItem>
                    ),

                    headerTitle: 'Player Name',
                    headerBackTitle: '',
                    headerBackVisible: true,
                    headerTintColor: '#fff',

                    headerStyle: {
                        backgroundColor: '#1B1B1B',
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
