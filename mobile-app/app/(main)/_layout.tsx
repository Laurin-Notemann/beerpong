import { Stack } from 'expo-router';
import { useEffect } from 'react';

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

    const modalStyles = useModalStyles();

    return (
        <Stack>
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
            <Stack.Screen name="editMatchPoints" options={modalStyles} />
        </Stack>
    );
}
