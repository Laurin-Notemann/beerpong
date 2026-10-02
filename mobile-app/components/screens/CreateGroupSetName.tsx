import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import TextInput from '@/components/TextInput';
import { useTheme } from '@/theme';

export interface CreateGroupSetNameProps {
    isPending: boolean;
    onSubmit: (group: { name: string }) => void;
}

export default function CreateGroupSetName({
    isPending,
    onSubmit,
}: CreateGroupSetNameProps) {
    const [name, setName] = useState('');

    const theme = useTheme();

    return (
        <GestureHandlerRootView>
            <>
                <Stack.Screen
                    options={{
                        headerTitle: 'Set Group Name',
                        headerBackVisible: true,
                        headerTintColor: theme.color.text.primary,

                        headerStyle: {
                            backgroundColor: theme.color.topNav,
                        },
                        headerTitleStyle: {
                            color: theme.color.text.primary,
                        },
                    }}
                />
                <Stack.Toolbar placement="right">
                    <Stack.Toolbar.Button
                        disabled={name.length < 1 || isPending}
                        onPress={() => onSubmit({ name })}
                    >
                        Next
                    </Stack.Toolbar.Button>
                </Stack.Toolbar>
                <View
                    style={{
                        backgroundColor: theme.color.bg,
                        flex: 1,

                        padding: 16,
                    }}
                >
                    <TextInput
                        autoFocus
                        required
                        placeholder="Group name"
                        returnKeyType="done"
                        onChangeText={(text) => setName(text.trim())}
                    />
                </View>
            </>
        </GestureHandlerRootView>
    );
}
