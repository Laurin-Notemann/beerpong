import { Stack, useNavigation } from 'expo-router';
import React, { useState } from 'react';

import Avatar from '@/components/Avatar';
import InputModal from '@/components/InputModal';
import TextInput from '@/components/TextInput';

export interface CreateNewPlayerProps {
    onCreate: (player: { name: string }) => void;
    existingPlayers?: string[];
    isPending: boolean;
}
export default function CreateNewPlayer({
    onCreate,
    existingPlayers,
    isPending,
}: CreateNewPlayerProps) {
    const nav = useNavigation();

    const [name, setName] = useState('');

    const existingPlayerName = existingPlayers?.find(
        (i) => i.toLowerCase() === name.toLowerCase()
    );

    return (
        <>
            <Stack.Screen options={{ headerTitle: 'Create new Player' }} />
            <Stack.Toolbar placement="left">
                <Stack.Toolbar.Button onPress={() => nav.goBack()}>
                    Cancel
                </Stack.Toolbar.Button>
            </Stack.Toolbar>
            <Stack.Toolbar placement="right">
                <Stack.Toolbar.Button
                    variant="done"
                    disabled={
                        name.length < 1 ||
                        (existingPlayerName?.length ?? 0) > 0 ||
                        isPending
                    }
                    onPress={() => onCreate({ name })}
                >
                    Create
                </Stack.Toolbar.Button>
            </Stack.Toolbar>
            <InputModal>
                <Avatar
                    name={name}
                    size={96}
                    style={{ marginHorizontal: 'auto' }}
                />
                <TextInput
                    errorMessage={
                        existingPlayerName
                            ? `There's already a player named "${existingPlayerName}" in this group.`
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
