import { Stack } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { InviteMenu } from '@/components/InviteMenu';
import { LeaderboardScopePicker } from '@/components/Leaderboard/LeaderboardScopePicker';
import { ScopePickerHeaderTitle } from '@/components/ScopePickerHeaderTitle';
import { LeaderboardSwiper } from '@/components/screens/LeaderboardSwiper';
import { PastSeasonsSwiper } from '@/components/screens/PastSeasonsSwiper';
import { SeasonModeSwitch } from '@/components/screens/SeasonModeSwitch';
import { AppBackground } from '@/lib/Background';
import { useInsets } from '@/lib/useInsets';

const swiperAtTop = false;

const screenOptions = { headerTitle: () => <ScopePickerHeaderTitle /> };

export default function Page() {
    const insets = useInsets(true, true);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack.Screen options={screenOptions} />
            <InviteMenu />
            <AppBackground />
            <SeasonModeSwitch
                current={<LeaderboardSwiper />}
                past={<PastSeasonsSwiper />}
            />
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
                <LeaderboardScopePicker />
            </View>
        </GestureHandlerRootView>
    );
}
