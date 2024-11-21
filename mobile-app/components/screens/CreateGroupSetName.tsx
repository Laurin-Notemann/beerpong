import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { HeaderItem } from '@/app/(tabs)/HeaderItem';
import { theme } from '@/theme';

import TextInput from '../TextInput';

export interface CreateGroupSetNameProps {
    onSubmit: (group: { name: string }) => void;
}

export default function CreateGroupSetName({
    onSubmit,
}: CreateGroupSetNameProps) {
    const [name, setName] = useState('');

    return (
        <GestureHandlerRootView>
            <>
                <Stack.Screen
                    options={{
                        headerRight: () => (
                            <HeaderItem onPress={() => onSubmit({ name })}>
                                Create
                            </HeaderItem>
                        ),

                        headerTitle: 'Create Group',
                        headerBackTitleVisible: false,
                        headerBackVisible: true,
                        headerTintColor: '#fff',

                        headerStyle: {
                            backgroundColor: '#000',
                        },
                        headerTitleStyle: {
                            color: theme.color.text.primary,
                        },
                    }}
                />
                <View
                    style={{
                        backgroundColor: 'black',
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
