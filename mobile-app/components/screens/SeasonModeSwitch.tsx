import { ReactNode, useDeferredValue, useState } from 'react';
import { View } from 'react-native';

import { useScopePicker } from '@/zustand/useScopePicker';

/**
 * Shows `current` or `past` depending on the scope picker. Each side mounts the first time it's
 * shown and then stays mounted (hidden), so switching back and forth doesn't rebuild every list.
 * The switch renders deferred, so the picker reacts to the tap right away.
 */
export function SeasonModeSwitch({
    current,
    past,
}: {
    current: ReactNode;
    past: ReactNode;
}) {
    const isPast = useDeferredValue(useScopePicker().isPastSeasonsMode);

    const [mounted, setMounted] = useState({ current: !isPast, past: isPast });
    if (!mounted[isPast ? 'past' : 'current']) {
        setMounted((prev) => ({
            ...prev,
            [isPast ? 'past' : 'current']: true,
        }));
    }

    return (
        <>
            {mounted.current && (
                <View style={{ flex: 1, display: isPast ? 'none' : 'flex' }}>
                    {current}
                </View>
            )}
            {mounted.past && (
                <View style={{ flex: 1, display: isPast ? 'flex' : 'none' }}>
                    {past}
                </View>
            )}
        </>
    );
}
