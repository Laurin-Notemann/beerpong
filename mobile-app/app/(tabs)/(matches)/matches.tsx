import { useIsFocused } from '@react-navigation/native';
import { Stack } from 'expo-router';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/app/Background';
import { useInsets } from '@/app/useInsets';
import { InviteMenu } from '@/components/InviteMenu';
import { LeaderboardScopePicker } from '@/components/Leaderboard/LeaderboardScopePicker';
import { ScopePickerHeaderTitle } from '@/components/ScopePickerHeaderTitle';
import { MatchesSwiper } from '@/components/screens/MatchesSwiper';
import { PastMatchesSwiper } from '@/components/screens/PastMatchesSwiper';
import { useScopePicker } from '@/zustand/useScopePicker';

const swiperAtTop = false;

function FocusedMatchesContent() {
    const scopePicker = useScopePicker();
    return scopePicker.isPastSeasonsMode ? (
        <PastMatchesSwiper />
    ) : (
        <MatchesSwiper />
    );
}

export default function Page() {
    const insets = useInsets(true, true, true);
    const isFocused = useIsFocused();

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack.Screen
                options={{
                    headerTitle: () => <ScopePickerHeaderTitle />,
                }}
            />
            <InviteMenu />
            <AppBackground />
            {isFocused ? <FocusedMatchesContent /> : null}
            {isFocused ? (
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
                    <LeaderboardScopePicker hasSortButton={false} />
                </SafeAreaView>
            ) : null}
        </GestureHandlerRootView>
    );
}
