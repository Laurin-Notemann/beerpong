import { useEffect, useRef } from 'react';
import { Text, TextStyle, View, ViewStyle } from 'react-native';
import Animated, {
    EntryExitAnimationFunction,
    LayoutAnimationConfig,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

import {
    EASE_OUT,
    EXIT_MS,
    ROLL_MS,
    UI_SPRING,
} from '@/components/liveMatch/motion';
import { withAlpha } from '@/components/next/tokens';
import { CupTeam } from '@/lib/cupHits';
import { useTheme } from '@/theme';

const SIZES = {
    regular: { height: 36, minWidth: 40, fontSize: 22, radius: 10 },
    compact: { height: 24, minWidth: 28, fontSize: 15, radius: 7 },
};

const LAYER: ViewStyle = {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
};

/** the new number comes in from below, the old one leaves upward */
function rollAnimations(travel: number, reducedMotion: boolean) {
    const enter: EntryExitAnimationFunction = () => {
        'worklet';
        const config = { duration: ROLL_MS, easing: EASE_OUT };
        return {
            initialValues: {
                opacity: 0,
                transform: [{ translateY: reducedMotion ? 0 : travel }],
            },
            animations: {
                opacity: withTiming(1, config),
                transform: [{ translateY: withTiming(0, config) }],
            },
        };
    };
    const exit: EntryExitAnimationFunction = () => {
        'worklet';
        const config = { duration: EXIT_MS, easing: EASE_OUT };
        return {
            initialValues: { opacity: 1, transform: [{ translateY: 0 }] },
            animations: {
                opacity: withTiming(0, config),
                transform: [
                    {
                        translateY: withTiming(
                            reducedMotion ? 0 : -travel,
                            config
                        ),
                    },
                ],
            },
        };
    };
    return { enter, exit };
}

/**
 * A team's score in its team color, with tabular digits and a fixed minimum width so the
 * layout doesn't move. A change rolls the number and pulses the chip briefly; under reduced
 * motion the numbers only crossfade.
 */
export function ScoreChip({
    value,
    team,
    size = 'regular',
}: {
    value: number;
    team: CupTeam;
    size?: keyof typeof SIZES;
}) {
    const theme = useTheme();
    const reducedMotion = useReducedMotion();
    const s = SIZES[size];
    const color = theme.color.team[team];

    const scale = useSharedValue(1);
    const previous = useRef(value);

    useEffect(() => {
        if (previous.current === value) return;
        previous.current = value;
        if (reducedMotion) return;

        scale.set(
            withSequence(
                withTiming(1.08, { duration: 90, easing: EASE_OUT }),
                withSpring(1, UI_SPRING)
            )
        );
    }, [value, reducedMotion, scale]);

    const pulse = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const { enter, exit } = rollAnimations(s.height * 0.6, reducedMotion);

    const text: TextStyle = {
        color,
        fontSize: s.fontSize,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    };

    return (
        <Animated.View
            accessibilityLabel={`${team === 'red' ? 'Red' : 'Blue'} team: ${value}`}
            style={[
                {
                    height: s.height,
                    minWidth: s.minWidth,
                    paddingHorizontal: 6,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: s.radius,
                    borderCurve: 'continuous',
                    overflow: 'hidden',
                    backgroundColor: withAlpha(
                        color,
                        theme.id === 'light' ? 0.12 : 0.18
                    ),
                },
                pulse,
            ]}
        >
            {/* sizes the chip to the number; the visible one is in the layer above */}
            <Text
                style={[text, { opacity: 0 }]}
                accessibilityElementsHidden
                importantForAccessibility="no"
            >
                {value}
            </Text>
            {/* the first value is just there; only changes roll */}
            <LayoutAnimationConfig skipEntering>
                <View style={LAYER} pointerEvents="none">
                    <Animated.View
                        key={value}
                        entering={enter}
                        exiting={exit}
                        style={LAYER}
                    >
                        <Text style={text}>{value}</Text>
                    </Animated.View>
                </View>
            </LayoutAnimationConfig>
        </Animated.View>
    );
}
