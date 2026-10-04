import { memo, useSyncExternalStore } from 'react';
import { Text, TextStyle } from 'react-native';

import { formatElapsed } from '@/lib/liveMatch/log';
import { useTheme } from '@/theme';

// One clock for every timer on screen (header, dock, sheet): a single timeout aligned to the
// next full second, running only while a timer is mounted.
const listeners = new Set<() => void>();
let timeout: ReturnType<typeof setTimeout> | undefined;

function tick() {
    listeners.forEach((listener) => listener());
    timeout = setTimeout(tick, 1000 - (Date.now() % 1000));
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    if (listeners.size === 1) {
        timeout = setTimeout(tick, 1000 - (Date.now() % 1000));
    }
    return () => {
        listeners.delete(listener);
        if (!listeners.size) clearTimeout(timeout);
    };
}

const currentSecond = () => Math.floor(Date.now() / 1000);

/**
 * Time since `startedAt` as m:ss (h:mm:ss past an hour). Re-renders only itself, once a
 * second. Pass the server's `startedAt`, or the pending create's `createdAt` while offline.
 */
export const LiveTimer = memo(function LiveTimer({
    startedAt,
    style,
}: {
    startedAt: string | undefined;
    style?: TextStyle;
}) {
    const theme = useTheme();
    const second = useSyncExternalStore(subscribe, currentSecond);

    const start = startedAt ? Date.parse(startedAt) : NaN;
    const elapsed = Number.isNaN(start) ? 0 : second * 1000 - start;

    return (
        <Text
            numberOfLines={1}
            style={{
                color: theme.color.text.secondary,
                fontSize: 13,
                fontWeight: '500',
                fontVariant: ['tabular-nums'],
                ...style,
            }}
        >
            {formatElapsed(elapsed)}
        </Text>
    );
});
