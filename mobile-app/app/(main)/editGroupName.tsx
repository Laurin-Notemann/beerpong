import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';

import { useGroupQuery, useUpdateGroupMutation } from '@/api/calls/groupHooks';
import InputModal from '@/components/InputModal';
import TextInput from '@/components/TextInput';
import { useNavigation } from '@/lib/navigation/useNavigation';
import { useTheme } from '@/theme';
import { showErrorToast } from '@/toast';
import { ConsoleLogger } from '@/utils/logging';

export default function Page() {
    const nav = useNavigation();

    const { id } = useLocalSearchParams<{ id: string }>();

    const groupQuery = useGroupQuery(id);

    const [value, setValue] = useState(groupQuery?.data?.data?.name || '');

    const updateGroupMutation = useUpdateGroupMutation();

    async function onSubmit() {
        try {
            await updateGroupMutation.mutateAsync({
                id,
                name: value,
            });
            nav.goBack();
        } catch (err) {
            ConsoleLogger.error('failed to update group:', err);
            showErrorToast('Failed to update group.');
        }
    }
    const theme = useTheme();

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: 'Group Name',
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
                    disabled={value.length < 1 || updateGroupMutation.isPending}
                    onPress={onSubmit}
                >
                    Done
                </Stack.Toolbar.Button>
            </Stack.Toolbar>
            <InputModal>
                <TextInput
                    required
                    placeholder="Group Name"
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
