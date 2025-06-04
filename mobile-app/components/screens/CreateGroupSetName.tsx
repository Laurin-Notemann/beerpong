import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { HeaderItem } from '@/components/HeaderItem';
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
                        headerRight: () => (
                            <HeaderItem
                                disabled={name.length < 1}
                                isLoading={isPending}
                                onPress={() => onSubmit({ name })}
                            >
                                Next
                            </HeaderItem>
                        ),

                        headerTitle: 'Set Group Name',
                        headerBackTitleVisible: false,
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
