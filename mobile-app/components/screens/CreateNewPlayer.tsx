import { Stack, useNavigation } from 'expo-router';
import React, { useState } from 'react';

import { HeaderItem } from '@/app/(tabs)/_layout';
import Avatar from '@/components/Avatar';
import InputModal from '@/components/InputModal';
import TextInput from '@/components/TextInput';

export interface CreateNewPlayerProps {
    onCreate: (player: { name: string }) => void;
}
export default function CreateNewPlayer({ onCreate }: CreateNewPlayerProps) {
    const nav = useNavigation();

    const [name, setName] = useState('');

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: 'Create new Player',
                    headerLeft: () => (
                        <HeaderItem onPress={() => nav.goBack()}>
                            Cancel
                        </HeaderItem>
                    ),
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
                <Avatar name={name} size={96} />
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
