import { useEffect } from 'react';
import {
    Easing,
    EntryExitAnimationFunction,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withSpring,
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
/**
 * Props for `PressableScale`: shrinks to 0.97 on press-in and comes back quickly without a
 * bounce. Under reduced motion it doesn't scale.
 */
export const pressFeedback = (reducedMotion: boolean) => ({
    pressedScale: reducedMotion ? 1 : 0.97,
    speed: 40,
    bounciness: 0,
});

/** stiffer, for leaving: about as quick as `EXIT_MS`, still without a bounce */
export const EXIT_SPRING = { stiffness: 900, damping: 60, mass: 1 };

/** how far floating chrome (the live match dock) travels when it enters or leaves */
const FLOAT_TRAVEL = 16;

/**
 * Entering for floating chrome: rises 16 pt on a spring while it fades in. Never scales from 0.
 * Reduced motion: fade only. Pass `useReducedMotion()`.
 */
export function floatIn(reducedMotion: boolean): EntryExitAnimationFunction {
    return () => {
        'worklet';
        return {
            initialValues: {
                opacity: 0,
                transform: [{ translateY: reducedMotion ? 0 : FLOAT_TRAVEL }],
            },
            animations: {
                opacity: withTiming(1, {
                    duration: ENTER_MS,
                    easing: EASE_OUT,
                }),
                transform: [{ translateY: withSpring(0, UI_SPRING) }],
            },
        };
    };
}

/** Exiting counterpart of `floatIn`: sinks and fades out, faster than it came. */
export function floatOut(reducedMotion: boolean): EntryExitAnimationFunction {
    return () => {
        'worklet';
        return {
            initialValues: { opacity: 1, transform: [{ translateY: 0 }] },
            animations: {
                opacity: withTiming(0, { duration: EXIT_MS, easing: EASE_OUT }),
                transform: [
                    {
                        translateY: withSpring(
                            reducedMotion ? 0 : FLOAT_TRAVEL,
                            EXIT_SPRING
                        ),
                    },
                ],
            },
        };
    };
}

/**
 * For a small chip that comes and goes (the dock's "+N"): from 0.95 and transparent to full,
 * on a spring; back out in `EXIT_MS`. Reduced motion: fade only.
 */
export function popIn(reducedMotion: boolean): EntryExitAnimationFunction {
    return () => {
        'worklet';
        return {
            initialValues: {
                opacity: 0,
                transform: [{ scale: reducedMotion ? 1 : 0.95 }],
            },
            animations: {
                opacity: withTiming(1, {
                    duration: ENTER_MS,
                    easing: EASE_OUT,
                }),
                transform: [{ scale: withSpring(1, UI_SPRING) }],
            },
        };
    };
}

export function popOut(reducedMotion: boolean): EntryExitAnimationFunction {
    return () => {
        'worklet';
        const config = { duration: EXIT_MS, easing: EASE_OUT };
        return {
            initialValues: { opacity: 1, transform: [{ scale: 1 }] },
            animations: {
                opacity: withTiming(0, config),
                transform: [
                    { scale: withTiming(reducedMotion ? 1 : 0.95, config) },
                ],
            },
        };
    };
}

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
