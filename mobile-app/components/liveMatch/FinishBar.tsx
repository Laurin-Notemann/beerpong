import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import type { LiveMatchSyncStatus } from '@/api/liveMatch/useLiveMatch';
import { EASE_OUT, ENTER_MS, EXIT_MS } from '@/components/liveMatch/motion';
import { SyncPill } from '@/components/liveMatch/SyncPill';
import { OverlayTextButton } from '@/components/overlay/OverlayTextButton';
import { useTheme } from '@/theme';

const HINT_HEIGHT = 20;

/**
 * The bottom of the live match screen: how far this phone's edits got, the Finish button, and
 * one line on why it's disabled. The hint's line is always reserved, so the button doesn't
 * jump when it appears.
 */
export function FinishBar({
    syncStatus,
    pendingCount,
    hint,
    isFinishing,
    onFinish,
    onHintPress,
}: {
    syncStatus: LiveMatchSyncStatus;
    pendingCount: number;
    /** set while the match can't be finished */
    hint: string | undefined;
    isFinishing: boolean;
    onFinish: () => void;
    onHintPress: () => void;
}) {
    const theme = useTheme();

    return (
        <View style={{ gap: 10, paddingHorizontal: 8 }}>
            <SyncPill status={syncStatus} pendingCount={pendingCount} />
            <View style={{ flexDirection: 'row' }}>
                <OverlayTextButton
                    fullWidth
                    title="Finish match"
                    isPending={isFinishing}
                    disabled={!!hint}
                    onPress={onFinish}
                />
            </View>
            <View style={{ height: HINT_HEIGHT, justifyContent: 'center' }}>
                {hint && (
                    <Animated.View
                        key={hint}
                        entering={FadeIn.duration(ENTER_MS).easing(EASE_OUT)}
                        exiting={FadeOut.duration(EXIT_MS)}
                    >
                        <Pressable
                            accessibilityRole="button"
                            onPress={onHintPress}
                            hitSlop={8}
                        >
                            <Text
                                numberOfLines={1}
                                style={{
                                    textAlign: 'center',
                                    color: theme.color.text.secondary,
                                    fontSize: 13,
                                }}
                            >
                                {hint}
                            </Text>
                        </Pressable>
                    </Animated.View>
                )}
            </View>
        </View>
    );
}
