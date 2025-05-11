import { Stack, useNavigation } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator } from 'react-native';

import Avatar from '@/components/Avatar';
import { HeaderItem } from '@/components/HeaderItem';
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
                            disabled={
                                name.length < 1 ||
                                (existingPlayerName?.length ?? 0) > 0 ||
                                isPending
                            }
                            onPress={() => onCreate({ name })}
                        >
                            {isPending ? <ActivityIndicator /> : 'Create'}
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
                        existingPlayerName
                            ? `There\'s already a player named "${existingPlayerName}" in this group.`
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
