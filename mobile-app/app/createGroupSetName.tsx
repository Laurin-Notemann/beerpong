import { Stack, useNavigation } from 'expo-router';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import CreateGroupSetName from '@/components/screens/CreateGroupSetName';

export default function Page() {
    const nav = useNavigation();

    return (
        <GestureHandlerRootView>
            <Stack.Screen options={{ headerShown: false }} />
            <CreateGroupSetName onSetName={(groupName) => {}} />
        </GestureHandlerRootView>
    );
}
