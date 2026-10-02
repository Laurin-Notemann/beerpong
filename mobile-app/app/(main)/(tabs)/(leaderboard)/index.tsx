import { Stack } from 'expo-router';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InviteMenu } from '@/components/InviteMenu';
import { LeaderboardScopePicker } from '@/components/Leaderboard/LeaderboardScopePicker';
import { ScopePickerHeaderTitle } from '@/components/ScopePickerHeaderTitle';
import { LeaderboardSwiper } from '@/components/screens/LeaderboardSwiper';
import { PastSeasonsSwiper } from '@/components/screens/PastSeasonsSwiper';
import { AppBackground } from '@/lib/Background';
import { useInsets } from '@/lib/useInsets';
import { useScopePicker } from '@/zustand/useScopePicker';

const swiperAtTop = false;

export default function Page() {
    const insets = useInsets(true, true, true);

    const scopePicker = useScopePicker();

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack.Screen
                options={{
                    headerTitle: () => <ScopePickerHeaderTitle />,
                }}
            />
            <InviteMenu />
            <AppBackground />
            {!scopePicker.isPastSeasonsMode && <LeaderboardSwiper />}
            {scopePicker.isPastSeasonsMode && <PastSeasonsSwiper />}
            <SafeAreaView
                key="scope-picker"
                pointerEvents="box-none"
                style={{
                    position: 'absolute',

                    top: swiperAtTop ? insets.top + 4 : undefined,
                    bottom: swiperAtTop ? undefined : insets.bottom + 4,

                    width: '100%',
                }}
            >
                <LeaderboardScopePicker />
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}
