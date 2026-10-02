import { Stack } from 'expo-router';
import React from 'react';

import { useNavigation } from '@/app/navigation/useNavigation';
import IconHead from '@/components/IconHead';
import InputModal from '@/components/InputModal';
import TextInput from '@/components/TextInput';
import { useCreateGroupStore } from '@/zustand/group/stateCreateGroupStore';

export default function Page() {
    const nav = useNavigation();

    const { sport, setSportCustomName } = useCreateGroupStore();

    return (
        <>
            <Stack.Screen options={{ headerTitle: 'Custom Game' }} />
            <Stack.Toolbar placement="right">
                <Stack.Toolbar.Button
                    variant="done"
                    onPress={() => nav.goBack()}
                >
                    Done
                </Stack.Toolbar.Button>
            </Stack.Toolbar>
            <InputModal>
                <IconHead
                    iconName="information-outline"
                    title="Custom Game"
                    description="Please let us know what game you'd like to use our app for, so we can consider adding official support :)"
                />
                <TextInput
                    autoFocus
                    defaultValue={sport?.custom?.name}
                    placeholder="Custom Game"
                    onChangeText={setSportCustomName}
                />
            </InputModal>
        </>
    );
}
