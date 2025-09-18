import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/app/Background';
import { useInsets } from '@/app/useInsets';
import { InviteModal } from '@/components/InviteModal';
import { LeaderboardScopePicker } from '@/components/Leaderboard/LeaderboardScopePicker';
import PillButton from '@/components/PillButton';
import { ScopePickerHeaderTitle } from '@/components/ScopePickerHeaderTitle';
import { LeaderboardSwiper } from '@/components/screens/LeaderboardSwiper';
import { PastSeasonsSwiper } from '@/components/screens/PastSeasonsSwiper';
import { useScopePicker } from '@/zustand/useScopePicker';

const swiperAtTop = false;

export default function Page() {
    const insets = useInsets(true, true, true);

    const scopePicker = useScopePicker();

    const [showInviteModal, setShowInviteModal] = useState(false);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <InviteModal
                isVisible={showInviteModal}
                onClose={() => setShowInviteModal(false)}
            />
            <Stack.Screen
                options={{
                    headerTitle: () => <ScopePickerHeaderTitle />,

                    headerRight: () => (
                        <PillButton
                            blur
                            style={{ marginRight: 4 }}
                            label="Invite"
                            iconName="share-outline"
                            onPress={() => setShowInviteModal(true)}
                        />
                    ),
                }}
            />
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
