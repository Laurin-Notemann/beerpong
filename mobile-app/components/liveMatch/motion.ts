import { useEffect } from 'react';
import {
    Easing,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

/**
 * Motion shared by the live match UI. Only transform and opacity animate; things enter with a
 * strong ease-out and leave faster. Under reduced motion only opacity changes.
 */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

export const ENTER_MS = 260;
export const EXIT_MS = 150;
/** the score chip's number roll */
export const ROLL_MS = 180;

/** critically damped: settles without a visible bounce */
export const UI_SPRING = { stiffness: 320, damping: 36, mass: 1 };

/** fades in and rises a few points on mount (opacity only under reduced motion) */
export function useEnterStyle(delayMs = 0) {
    const reducedMotion = useReducedMotion();
    const progress = useSharedValue(0);

    useEffect(() => {
        const timer = setTimeout(() => {
            progress.set(
                withTiming(1, { duration: ENTER_MS, easing: EASE_OUT })
            );
        }, delayMs);
        return () => clearTimeout(timer);
    }, [delayMs, progress]);

    return useAnimatedStyle(() => ({
        opacity: progress.value,
        transform: reducedMotion
            ? []
            : [
                  { translateY: (1 - progress.value) * 8 },
                  { scale: 0.97 + progress.value * 0.03 },
              ],
    }));
}
