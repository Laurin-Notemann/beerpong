import { Activity, ReactNode, useDeferredValue, useState } from 'react';
import { View } from 'react-native';

import { useScopePicker } from '@/zustand/useScopePicker';

/**
 * Shows `current` or `past` depending on the scope picker. Each side mounts the first time it's
 * shown and then stays mounted in a hidden <Activity>, so switching back and forth doesn't
 * rebuild every list. The switch renders deferred, so the picker reacts to the tap right away.
 *
 * <Activity> rather than just `display: 'none'`: a hidden side's effects don't run, and a
 * Legend List that measures its rows under `display: 'none'` reads 0 for every row, then
 * mounts a row for every item until React gives up with "Maximum update depth exceeded"
 * (MOBILE-N, after a refetch of the hidden lists).
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
                <Activity mode={isPast ? 'hidden' : 'visible'}>
                    <View style={{ flex: 1 }}>{current}</View>
                </Activity>
            )}
            {mounted.past && (
                <Activity mode={isPast ? 'visible' : 'hidden'}>
                    <View style={{ flex: 1 }}>{past}</View>
                </Activity>
            )}
        </>
    );
}
