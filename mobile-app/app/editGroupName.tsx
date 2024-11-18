import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import Toast from 'react-native-root-toast';

import { useGroupQuery, useUpdateGroupMutation } from '@/api/calls/groupHooks';
import InputModal from '@/components/InputModal';
import TextInput from '@/components/TextInput';
import { theme } from '@/theme';
import { ConsoleLogger } from '@/utils/logging';

import { HeaderItem } from './(tabs)/_layout';
import { useNavigation } from './navigation/useNavigation';

export default function Page() {
    const nav = useNavigation();

    const { id } = useLocalSearchParams<{ id: string }>();

    const groupQuery = useGroupQuery(id);

    const [value, setValue] = useState(groupQuery?.data?.data?.name || '');

    const { mutateAsync } = useUpdateGroupMutation();

    async function onSubmit() {
        try {
            await mutateAsync({
                id,
                name: value,
            });
            nav.navigate('index');
        } catch (err) {
            ConsoleLogger.error('failed to update group:', err);
            Toast.show('Failed to update group.', {
                duration: 1500,
                position: 1,
            });
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
