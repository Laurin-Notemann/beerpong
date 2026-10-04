import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { LiveMatchSyncStatus } from '@/api/liveMatch/useLiveMatch';
import { Icon, IconName } from '@/components/Icon';
import { EASE_OUT, ENTER_MS, EXIT_MS } from '@/components/liveMatch/motion';
import { useNextTokens } from '@/components/next/tokens';
import { syncLabel } from '@/lib/liveMatch/labels';

/** most edits reach the server within this; "Saving…" only shows when one takes longer */
const SAVING_DELAY_MS = 600;

const ICONS: Record<LiveMatchSyncStatus, IconName> = {
    synced: 'check',
    syncing: 'cloud-upload-outline',
    offline: 'cloud-off-outline',
};

/**
 * Settles the raw status: a quick save keeps showing what was there before ("Saved", or
 * "Offline" while a retry runs), so the pill doesn't flicker on every tap.
 */
function useSettledStatus(status: LiveMatchSyncStatus) {
    const [stable, setStable] = useState<LiveMatchSyncStatus>(
        status === 'syncing' ? 'synced' : status
    );
    const [isSlow, setIsSlow] = useState(false);

    if (status !== 'syncing' && (stable !== status || isSlow)) {
        setStable(status);
        setIsSlow(false);
    }

    useEffect(() => {
        if (status !== 'syncing') return;
        const timer = setTimeout(() => setIsSlow(true), SAVING_DELAY_MS);
        return () => clearTimeout(timer);
    }, [status]);

    return status === 'syncing' && !isSlow ? stable : status;
}

/** "Saved" / "Saving…" / "Offline · 3 waiting". A new state fades out the old one, then in. */
export function SyncPill({
    status,
    pendingCount,
}: {
    status: LiveMatchSyncStatus;
    pendingCount: number;
}) {
    const t = useNextTokens();
    const settled = useSettledStatus(status);

    const [shown, setShown] = useState(() => ({
        status: settled,
        label: syncLabel(settled, pendingCount),
    }));
    // only the waiting count changed: swap without a fade
    const label = syncLabel(settled, pendingCount);
    if (settled === shown.status && label !== shown.label) {
        setShown({ status: settled, label });
    }

    const opacity = useSharedValue(1);

    useEffect(() => {
        if (settled === shown.status) {
            // also when it changed back before a fade-out finished
            opacity.set(
                withTiming(1, { duration: ENTER_MS, easing: EASE_OUT })
            );
            return;
        }
        // fade out, swap while invisible (the width changes then), fade back in
        const next = {
            status: settled,
            label: syncLabel(settled, pendingCount),
        };
        opacity.set(
            withTiming(0, { duration: EXIT_MS }, (finished) => {
                if (finished) scheduleOnRN(setShown, next);
            })
        );
    }, [settled, pendingCount, shown.status, opacity]);

    const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
    const isOffline = shown.status === 'offline';

    return (
        <View
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
            style={{
                alignSelf: 'center',
                height: 26,
                paddingHorizontal: 10,
                borderRadius: 13,
                borderWidth: 1,
                borderColor: t.hairline,
                backgroundColor: t.surface,
                justifyContent: 'center',
            }}
        >
            <Animated.View
                style={[
                    { flexDirection: 'row', alignItems: 'center', gap: 5 },
                    style,
                ]}
            >
                <Icon
                    name={ICONS[shown.status]}
                    size={13}
                    color={isOffline ? t.theme.color.negative : t.textSecondary}
                />
                <Text
                    numberOfLines={1}
                    style={{
                        color: isOffline ? t.text : t.textSecondary,
                        fontSize: 12,
                        fontWeight: '500',
                        fontVariant: ['tabular-nums'],
                    }}
                >
                    {shown.label}
                </Text>
            </Animated.View>
        </View>
    );
}
