import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';

import { useGroupQuery, useUpdateGroupMutation } from '@/api/calls/groupHooks';
import { useNavigation } from '@/app/navigation/useNavigation';
import { HeaderItem } from '@/components/HeaderItem';
import InputModal from '@/components/InputModal';
import TextInput from '@/components/TextInput';
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
                    headerRight: () => (
                        <HeaderItem
                            isLoading={updateGroupMutation.isPending}
                            disabled={value.length < 1}
                            noMargin
                            onPress={onSubmit}
                        >
                            Done
                        </HeaderItem>
                    ),

                    headerTitle: 'Group Name',
                    headerBackTitleVisible: false,
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
