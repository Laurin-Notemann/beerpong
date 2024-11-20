import { Stack } from 'expo-router';
import React, { useState } from 'react';

import InputModal from '@/components/InputModal';
import TextInput from '@/components/TextInput';
import { theme } from '@/theme';

import { HeaderItem } from './(tabs)/HeaderItem';

export default function Page() {
    const [value, setValue] = useState('');

    return (
        <>
            <Stack.Screen
                options={{
                    headerRight: () => <HeaderItem noMargin>Done</HeaderItem>,

                    headerTitle: 'Formation Name',
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
