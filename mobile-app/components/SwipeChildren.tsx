import React from 'react';
import { View } from 'react-native';
import Animated, {
    Extrapolation,
    interpolate,
    SharedValue,
    useAnimatedStyle,
} from 'react-native-reanimated';

type SwipeChildrenProps = {
    /** 0 shows first child, 1 shows second, etc. Fractional values animate between. */
    progress: SharedValue<number>;
    children: React.ReactNode;
    /** Slide distance in px */
    distance?: number;
    /** If true, new items slide in from the right side; otherwise from the left */
    right?: boolean;
    height?: number;
    /**
     * Fixed, so the native header never has to resize its title view (iOS keeps the size a
     * custom title view had when it was attached). Children are centered in it.
     */
    width?: number;
};

function SwipeChildItem({
    index,
    progress,
    distance,
    dir,
    children,
}: {
    index: number;
    progress: SharedValue<number>;
    distance: number;
    dir: 1 | -1;
    children: React.ReactNode;
}) {
    const style = useAnimatedStyle(() => {
        const rel = index - progress.value;
        return {
            transform: [{ translateX: rel * dir * distance }],
            opacity: interpolate(
                Math.abs(rel),
                [0, 1, 1.0001],
                [1, 0, 0],
                Extrapolation.CLAMP
            ),
        };
    });

    return (
        <Animated.View
            style={[
                {
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    alignItems: 'center',
                },
                style,
            ]}
        >
            {children}
        </Animated.View>
    );
}

/** Crossfades between its children as `progress` moves, e.g. a header title per swiper page. */
export function SwipeChildren({
    progress,
    children,
    distance = 96,
    right = false,
    height = 21,
    width = 220,
}: SwipeChildrenProps) {
    return (
        <View style={{ overflow: 'hidden', width, height }}>
            {React.Children.toArray(children).map((child, i) => (
                <SwipeChildItem
                    key={i}
                    index={i}
                    progress={progress}
                    distance={distance}
                    dir={right ? 1 : -1}
                >
                    {child}
                </SwipeChildItem>
            ))}
        </View>
    );
}
