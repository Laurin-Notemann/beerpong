import { Stack, useNavigation } from 'expo-router';
import React, { useState } from 'react';

import Avatar from '@/components/Avatar';
import { HeaderItem } from '@/components/HeaderItem';
import InputModal from '@/components/InputModal';
import TextInput from '@/components/TextInput';

export interface CreateNewPlayerProps {
    onCreate: (player: { name: string }) => void;
    existingPlayers?: string[];
}
export default function CreateNewPlayer({
    onCreate,
    existingPlayers,
}: CreateNewPlayerProps) {
    const nav = useNavigation();

    const [name, setName] = useState('');

    const playerAlreadyExists = existingPlayers?.includes(name);

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
                            disabled={name.length < 1 || playerAlreadyExists}
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
                    style={{ marginHorizontal: 'auto' }}
                />
                <TextInput
                    errorMessage={
                        playerAlreadyExists
                            ? `There\'s already a player named "${name}" in this group.`
                            : undefined
                    }
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
