import { DrawerActions, useNavigation } from '@react-navigation/native';
import { Stack } from 'expo-router';
import React from 'react';

import { useGroupQuery } from '@/api/calls/groupHooks';
import { useNavStyles } from '@/app/navigation/navStyles';
import { useGroupStore } from '@/zustand/group/stateGroupStore';

/**
 * The stack inside each native tab. Its root screen shows the selected group's name and
 * the native "Groups" button that opens the group drawer; pages add their own right items.
 */
export function TabStack({ root }: { root: string }) {
    const navStyles = useNavStyles();
    const navigation = useNavigation();

    const { selectedGroupId } = useGroupStore();
    const selectedGroup = useGroupQuery(selectedGroupId);

    return (
        <Stack screenOptions={navStyles}>
            <Stack.Screen
                name={root}
                options={{
                    title: selectedGroup.data?.data?.name ?? '',
                }}
            >
                <Stack.Toolbar placement="left">
                    <Stack.Toolbar.Button
                        icon="person.3"
                        onPress={() =>
                            navigation.dispatch(DrawerActions.openDrawer())
                        }
                    >
                        Groups
                    </Stack.Toolbar.Button>
                </Stack.Toolbar>
            </Stack.Screen>
        </Stack>
    );
}
