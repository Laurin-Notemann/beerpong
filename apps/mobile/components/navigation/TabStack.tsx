import { Stack } from 'expo-router';
import { DrawerActions, useNavigation } from 'expo-router/react-navigation';
import React from 'react';
import { View } from 'react-native';

import { useGroupQuery } from '@/api/calls/groupHooks';
import { useTournaments } from '@/api/calls/tournamentHooks';
import {
    DOCK_IN_TAB_BAR,
    FLOATING_DOCK_INSET,
    FloatingLiveMatchDock,
} from '@/components/liveMatch/LiveMatchDock';
import {
    TournamentBanner,
    TOURNAMENT_BANNER_INSET,
} from '@/components/tournament/TournamentBanner';
import { useLiveMatchDock } from '@/lib/liveMatch/useLiveMatchDock';
import { useNavStyles } from '@/lib/navigation/navStyles';
import { FloatingDockInsetContext, useInsets } from '@/lib/useInsets';
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

    // without the bottom accessory, each tab stack floats its own dock
    const tournament = useTournaments(selectedGroupId).data?.find(
        (t) => t.status === 'ACTIVE'
    );
    const useAccessory = DOCK_IN_TAB_BAR && !tournament;
    const tabBarTop = useInsets(false, true).bottom;
    const dock = useLiveMatchDock({ enabled: !useAccessory });
    const floatingDock = dock.snapshot;

    return (
        <View style={{ flex: 1 }}>
            {/* the tab's screens make room for the dock; the dock itself sits outside */}
            <FloatingDockInsetContext.Provider
                value={
                    (floatingDock ? FLOATING_DOCK_INSET : 0) +
                    (tournament ? TOURNAMENT_BANNER_INSET : 0)
                }
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
            {!useAccessory && (
                <FloatingLiveMatchDock
                    snapshot={floatingDock}
                    bottomOffset={tournament ? TOURNAMENT_BANNER_INSET : 0}
                    onPress={dock.open}
                    onMore={dock.openList}
                />
            )}
            {tournament && (
                <TournamentBanner tournament={tournament} bottom={tabBarTop} />
            )}
        </View>
    );
}
