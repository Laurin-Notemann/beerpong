import { Stack } from 'expo-router';
import React, { useState } from 'react';

import InputModal from '@/components/InputModal';
import TextInput from '@/components/TextInput';
import { useTheme } from '@/theme';

export default function Page() {
    const [value, setValue] = useState('');

    const theme = useTheme();

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: 'Formation Name',
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
                <Stack.Toolbar.Button variant="done">Done</Stack.Toolbar.Button>
            </Stack.Toolbar>
            <InputModal>
                <TextInput
                    required
                    placeholder="Formation Name"
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
