import { Stack } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { InviteMenu } from '@/components/InviteMenu';
import { LeaderboardScopePicker } from '@/components/Leaderboard/LeaderboardScopePicker';
import { ScopePickerHeaderTitle } from '@/components/ScopePickerHeaderTitle';
import { MatchesSwiper } from '@/components/screens/MatchesSwiper';
import { PastMatchesSwiper } from '@/components/screens/PastMatchesSwiper';
import { SeasonModeSwitch } from '@/components/screens/SeasonModeSwitch';
import { AppBackground } from '@/lib/Background';
import { useInsets } from '@/lib/useInsets';

const screenOptions = { headerTitle: () => <ScopePickerHeaderTitle /> };

export default function Page() {
    const insets = useInsets(true, true);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack.Screen options={screenOptions} />
            <InviteMenu />
            <AppBackground />
            <SeasonModeSwitch
                current={<MatchesSwiper />}
                past={<PastMatchesSwiper />}
            />
            <View
                key="scope-picker"
                pointerEvents="box-none"
                style={{
                    position: 'absolute',
                    bottom: insets.bottom + 4,

                    width: '100%',
                }}
            >
                <LeaderboardScopePicker hasSortButton={false} />
            </View>
        </GestureHandlerRootView>
    );
}
