import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
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
};

type SwipeChildItemProps = {
    index: number;
    progress: SharedValue<number>;
    distance: number;
    swipeDir: 1 | -1;
    onLayout: (e: LayoutChangeEvent) => void;
    child: React.ReactNode;
    itemWidth: number;
    containerWidth: number | undefined;
};

const SwipeChildItem = React.memo<SwipeChildItemProps>(
    ({
        index,
        progress,
        distance,
        swipeDir: dir,
        onLayout,
        child,
        itemWidth,
        containerWidth,
    }) => {
        const style = useAnimatedStyle(() => {
            const rel = index - progress.value;
            return {
                position: 'absolute',
                left: ((containerWidth ?? 0) - itemWidth) / 2,
                transform: [{ translateX: rel * dir * distance }],
                opacity: interpolate(
                    Math.abs(rel),
                    [0, 1, 1.0001],
                    [1, 0, 0],
                    Extrapolation.CLAMP
                ),
            };
        }, [distance, dir, itemWidth, containerWidth]);

        return (
            <Animated.View onLayout={onLayout} style={style}>
                {child}
            </Animated.View>
        );
    }
);

export const SwipeChildren: React.FC<SwipeChildrenProps> = ({
    progress,
    children,
    distance = 96,
    right = false,
    height = 22,
}) => {
    const items = useMemo(() => React.Children.toArray(children), [children]);
    const [widths, setWidths] = useState<number[]>(Array(items.length).fill(0));

    const onLayoutAt =
        (idx: number) =>
        (e: LayoutChangeEvent): void => {
            const w = e?.nativeEvent?.layout?.width ?? 0;
            setWidths((prev) => {
                if (prev[idx] === w) return prev;
                const next = prev.slice();
                next[idx] = w;
                return next;
            });
        };

    const containerWidth =
        widths.reduce((m, w) => Math.max(m, w), 0) || undefined;

    const swipeDir = right ? 1 : -1;

    return (
        <View
            style={{
                overflow: 'hidden',
                width: containerWidth,
                height,
                position: 'relative',
            }}
        >
            {items.map((child, i) => (
                <SwipeChildItem
                    key={i}
                    index={i}
                    progress={progress}
                    distance={distance}
                    swipeDir={swipeDir}
                    onLayout={onLayoutAt(i)}
                    child={child}
                    itemWidth={widths[i] ?? 0}
                    containerWidth={containerWidth}
                />
            ))}
        </View>
    );
};
