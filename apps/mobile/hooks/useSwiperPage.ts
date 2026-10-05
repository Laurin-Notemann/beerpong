import { useState } from 'react';
import { SharedValue, useAnimatedReaction } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

/**
 * The page a `Swiper` is closest to, as React state, for native header items that change
 * with the page. It flips halfway through a swipe, before the pager settles.
 */
export function useSwiperPage(swiperProgress: SharedValue<number>) {
    const [page, setPage] = useState(0);

    useAnimatedReaction(
        () => Math.round(swiperProgress.value),
        (current, previous) => {
            if (current !== previous) scheduleOnRN(setPage, current);
        }
    );

    return page;
}
