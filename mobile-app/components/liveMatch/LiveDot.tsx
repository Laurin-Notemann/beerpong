import { useEffect } from 'react';
import Animated, {
    cancelAnimation,
    Easing,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

/** A green dot that slowly breathes while a match is live. Still under reduced motion. */
export function LiveDot({
    size = 8,
    color,
    pulsing = true,
}: {
    size?: number;
    /** defaults to the theme's positive green */
    color?: string;
    /** off once the match has ended */
    pulsing?: boolean;
}) {
    const theme = useTheme();
    const reducedMotion = useReducedMotion();
    const opacity = useSharedValue(1);

    const animate = pulsing && !reducedMotion;

    useEffect(() => {
        if (!animate) {
            cancelAnimation(opacity);
            opacity.set(1);
            return;
        }
        // one cycle out and back is ~1.6 s
        opacity.set(
            withRepeat(
                withTiming(0.35, {
                    duration: 800,
                    easing: Easing.inOut(Easing.ease),
                }),
                -1,
                true
            )
        );
        return () => cancelAnimation(opacity);
    }, [animate, opacity]);

    const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

    return (
        <Animated.View
            style={[
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: color ?? theme.color.positive,
                },
                style,
            ]}
        />
    );
}
