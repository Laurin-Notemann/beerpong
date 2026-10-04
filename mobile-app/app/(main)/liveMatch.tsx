import { useLocalSearchParams } from 'expo-router';
import React, { useRef } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';

import ErrorScreen from '@/components/ErrorScreen';
import { FinishBar } from '@/components/liveMatch/FinishBar';
import { InsetFree } from '@/components/liveMatch/InsetFree';
import { LiveMatchEnded } from '@/components/liveMatch/LiveMatchEnded';
import { LiveMatchHeader } from '@/components/liveMatch/LiveMatchHeader';
import { PageTabs } from '@/components/liveMatch/PageTabs';
import { Scoreboard } from '@/components/liveMatch/Scoreboard';
import LoadingScreen from '@/components/LoadingScreen';
import CreateMatchAssignPoints from '@/components/screens/CreateMatchAssignPoints';
import NewMatchCups from '@/components/screens/NewMatchCups';
import { Swiper, SwiperRef } from '@/components/Swiper';
import { AppBackground } from '@/lib/Background';
import { useLiveMatchScreen } from '@/lib/liveMatch/useLiveMatchScreen';
import { useInsets } from '@/lib/useInsets';

/**
 * Entering a live match: the score on top, the cups and points pages (as in the pro mode
 * draft) in the middle, and Finish at the bottom. Every phone in the group can have it open.
 */
export default function LiveMatchPage() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const screen = useLiveMatchScreen(id);
    const insets = useInsets(true);

    const pagerRef = useRef<SwiperRef>(null);
    const pagerProgress = useSharedValue(0);

    const isLive = !!screen.header && !screen.ended;

    const body = (() => {
        if (screen.ended === 'finished') {
            return (
                <LiveMatchEnded kind="finished" onAction={screen.viewResult} />
            );
        }
        if (screen.ended === 'discarded') {
            return <LiveMatchEnded kind="discarded" onAction={screen.close} />;
        }
        if (screen.error) return <ErrorScreen error={screen.error} />;
        if (!screen.header) return <LoadingScreen />;

        return (
            <View
                style={{
                    flex: 1,
                    paddingTop: insets.top + 8,
                    paddingBottom: insets.bottom + 8,
                }}
            >
                <View style={{ paddingHorizontal: 16, gap: 12 }}>
                    <Scoreboard red={screen.red} blue={screen.blue} />
                    <PageTabs
                        titles={['Cups', 'Points']}
                        progress={pagerProgress}
                        onSelect={(index) =>
                            pagerRef.current?.scrollTo({ index })
                        }
                    />
                </View>
                <InsetFree>
                    <Swiper ref={pagerRef} swiperProgress={pagerProgress}>
                        <NewMatchCups liveMatchId={id} />
                        <CreateMatchAssignPoints
                            liveMatchId={id}
                            players={screen.teamMembers}
                            onPlayerPress={screen.openPlayer}
                        />
                    </Swiper>
                </InsetFree>
                <FinishBar
                    syncStatus={screen.syncStatus}
                    pendingCount={screen.pendingCount}
                    hint={screen.hint}
                    isFinishing={screen.isFinishing}
                    onFinish={screen.finish}
                    onHintPress={screen.openFinish}
                />
            </View>
        );
    })();

    return (
        <GestureHandlerRootView>
            <LiveMatchHeader
                startedAt={screen.header?.startedAt}
                isLive={isLive}
                onDiscard={screen.discard}
            />
            <AppBackground />
            {body}
        </GestureHandlerRootView>
    );
}
