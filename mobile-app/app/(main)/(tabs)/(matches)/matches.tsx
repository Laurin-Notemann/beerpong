import { Stack } from 'expo-router';
import { useIsFocused } from 'expo-router/react-navigation';
import React from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { InviteMenu } from '@/components/InviteMenu';
import { LeaderboardScopePicker } from '@/components/Leaderboard/LeaderboardScopePicker';
import { ScopePickerHeaderTitle } from '@/components/ScopePickerHeaderTitle';
import { MatchesSwiper } from '@/components/screens/MatchesSwiper';
import { PastMatchesSwiper } from '@/components/screens/PastMatchesSwiper';
import { AppBackground } from '@/lib/Background';
import { useInsets } from '@/lib/useInsets';
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
    const insets = useInsets(true, true);
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
                <View
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
                </View>
            ) : null}
        </GestureHandlerRootView>
    );
}
