import { Stack, useNavigation } from 'expo-router';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import CreateGroup from '@/components/screens/CreateGroup';

export default function Page() {
    const members = [
        { name: 'Laurin' },
        { name: 'foo' },
        { name: 'bar' },
        { name: 'schokoauto' },
    ];

    const nav = useNavigation();

    return (
        <GestureHandlerRootView>
            <Stack.Screen options={{ headerShown: false }} />
            <CreateGroup
                members={members}
                onCreateMember={(memberName) => {
                    // @ts-ignore
                    nav.navigate('createGroupSetName');
                }}
                onCreate={() => {}}
            />
        </GestureHandlerRootView>
    );
}
