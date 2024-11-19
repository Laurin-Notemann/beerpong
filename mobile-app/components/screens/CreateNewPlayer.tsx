import { Stack } from 'expo-router';
import React, { useState } from 'react';

import { HeaderItem } from '@/app/(tabs)/_layout';
import Avatar from '@/components/Avatar';
import InputModal from '@/components/InputModal';
import TextInput from '@/components/TextInput';
import { theme } from '@/theme';

export interface CreateNewPlayerProps {
    onCreate: (player: { name: string }) => void;
}
export default function CreateNewPlayer({ onCreate }: CreateNewPlayerProps) {
    const [name, setName] = useState('');

    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Create new Player',
                    headerStyle: {
                        backgroundColor: theme.color.topNav,

                        // @ts-ignore
                        elevation: 0, // For Android
                        shadowOpacity: 0, // For iOS
                        borderBottomWidth: 0, // Removes the border for both platforms
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                    headerRight: () => (
                        <HeaderItem
                            disabled={name.length < 1}
                            onPress={() => onCreate({ name })}
                        >
                            Create
                        </HeaderItem>
                    ),
                }}
            />
            <InputModal>
                <Avatar
                    name={name}
                    size={96}
                    canUpload
                    onPress={async () => {}}
                />
                <TextInput
                    required
                    placeholder="Player Name"
                    onChangeText={(text) => setName(text.trim())}
                    autoFocus
                    style={{
                        alignSelf: 'stretch',
                    }}
                />
            </InputModal>
        </>
    );
}
