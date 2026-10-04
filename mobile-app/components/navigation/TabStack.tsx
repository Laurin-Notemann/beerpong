import { Stack } from 'expo-router';
import { DrawerActions, useNavigation } from 'expo-router/react-navigation';
import React from 'react';
import { View } from 'react-native';

import { useGroupQuery } from '@/api/calls/groupHooks';
import {
    DOCK_IN_TAB_BAR,
    FLOATING_DOCK_INSET,
    FloatingLiveMatchDock,
} from '@/components/liveMatch/LiveMatchDock';
import { useLiveMatchDock } from '@/lib/liveMatch/useLiveMatchDock';
import { useNavStyles } from '@/lib/navigation/navStyles';
import { FloatingDockInsetContext } from '@/lib/useInsets';
import { useGroupStore } from '@/zustand/group/stateGroupStore';

/**
 * The stack inside each native tab. Its root screen shows the selected group's name and
 * the native "Groups" button that opens the group drawer; pages add their own right items.
 * Without a bottom accessory (Android, iOS before 26) it also floats the live match dock over
 * the tab's bottom edge.
 */
export function TabStack({ root }: { root: string }) {
    const navStyles = useNavStyles();
    const navigation = useNavigation();

    const { selectedGroupId } = useGroupStore();
    const selectedGroup = useGroupQuery(selectedGroupId);

    const dock = useLiveMatchDock();
    const floatingDock = DOCK_IN_TAB_BAR ? undefined : dock.snapshot;

    return (
        <View style={{ flex: 1 }}>
            {/* the tab's screens make room for the dock; the dock itself sits outside */}
            <FloatingDockInsetContext.Provider
                value={floatingDock ? FLOATING_DOCK_INSET : 0}
            >
                <Stack screenOptions={navStyles}>
                    <Stack.Screen
                        name={root}
                        options={{
                            title: selectedGroup.data?.data?.name ?? '',
                        }}
                    >
                        <Stack.Toolbar placement="left">
                            <Stack.Toolbar.Button
                                onPress={() =>
                                    navigation.dispatch(
                                        DrawerActions.openDrawer()
                                    )
                                }
                            >
                                Groups
                            </Stack.Toolbar.Button>
                        </Stack.Toolbar>
                    </Stack.Screen>
                </Stack>
            </FloatingDockInsetContext.Provider>
            {!DOCK_IN_TAB_BAR && (
                <FloatingLiveMatchDock
                    snapshot={floatingDock}
                    onPress={dock.open}
                />
            )}
        </View>
    );
}
