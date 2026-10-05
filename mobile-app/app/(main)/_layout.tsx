import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { useLiveMatchSync } from '@/api/liveMatch/useLiveMatchSync';
import { useApi } from '@/api/utils/create-api';
import { useModalStyles } from '@/lib/navigation/modalStyles';
import {
    useEnsureGroupSelected,
    useGroupStore,
} from '@/zustand/group/stateGroupStore';

export const unstable_settings = { anchor: '(tabs)' };

/** Every screen lives in this stack; the root layout wraps it in the group drawer. */
export default function MainLayout() {
    const { connectRealtime } = useApi();

    const { groupIds } = useGroupStore();
    useEnsureGroupSelected();

    useEffect(() => {
        connectRealtime(groupIds);
    }, [connectRealtime, groupIds]);

    // sends live match edits queued on this phone, also those from before an app kill
    useLiveMatchSync();

    const modalStyles = useModalStyles();

    return (
        // arrow-only back buttons: the previous title would squeeze this screen's title
        <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
            <Stack.Screen
                name="onboarding"
                options={{ title: '', headerShown: false }}
            />
            <Stack.Screen
                name="(tabs)"
                options={{ title: '', headerShown: false }}
            />

            <Stack.Screen name="createNewPlayer" options={modalStyles} />
            <Stack.Screen name="createNewRule" options={modalStyles} />
            <Stack.Screen name="rule" options={modalStyles} />
            <Stack.Screen name="allowedMove" options={modalStyles} />

            <Stack.Screen name="editRankPlayersBy" options={modalStyles} />
            <Stack.Screen
                name="dailyLeaderboardSettings"
                options={modalStyles}
            />

            <Stack.Screen name="teamSizeSettings" options={modalStyles} />
            <Stack.Screen
                name="minMatchesToQualifySettings"
                options={modalStyles}
            />

            <Stack.Screen
                name="createGroupCustomGameModal"
                options={modalStyles}
            />
            <Stack.Screen
                name="cropAvatar"
                options={{
                    animation: 'fade',
                }}
            />
            <Stack.Screen
                name="assignPointsToPlayerModal"
                options={modalStyles}
            />
            <Stack.Screen name="assignCupHitModal" options={modalStyles} />
            <Stack.Screen name="rerackModal" options={modalStyles} />
            <Stack.Screen name="liveMatchTeamsModal" options={modalStyles} />
            <Stack.Screen name="editMatchPoints" options={modalStyles} />

            {/* a full screen pushed like `match`, so the pager's swipes don't fight a sheet */}
            <Stack.Screen name="liveMatch" />
            {/* the dock opens it when several matches are live */}
            <Stack.Screen name="liveMatches" options={modalStyles} />
        </Stack>
    );
}
