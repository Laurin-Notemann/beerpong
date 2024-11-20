import { Stack } from 'expo-router';
import React, { useState } from 'react';

import { HeaderItem } from '@/app/(tabs)/HeaderItem';
import InputModal from '@/components/InputModal';
import TextInput from '@/components/TextInput';
import { theme } from '@/theme';

export default function Page() {
    const [value, setValue] = useState('');

    return (
        <>
            <Stack.Screen
                options={{
                    headerRight: () => <HeaderItem noMargin>Done</HeaderItem>,

                    headerTitle: 'Formation Name',
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
