import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { HeaderItem } from '@/components/HeaderItem';
import { theme } from '@/theme';

import TextInput from '../TextInput';

export interface CreateGroupSetNameProps {
    isPending: boolean;
    onSubmit: (group: { name: string }) => void;
}

export default function CreateGroupSetName({
    isPending,
    onSubmit,
}: CreateGroupSetNameProps) {
    const [name, setName] = useState('');

    return (
        <GestureHandlerRootView>
            <>
                <Stack.Screen
                    options={{
                        headerRight: () => (
                            <HeaderItem
                                disabled={name.length < 1 || isPending}
                                onPress={() => onSubmit({ name })}
                            >
                                {isPending ? <ActivityIndicator /> : 'Create'}
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
