// PressableScale.tsx
import React, { useMemo, useRef } from 'react';
import {
    Animated,
    Pressable,
    PressableProps,
    StyleProp,
    ViewStyle,
} from 'react-native';

type Props = {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    /** Scale on press-in (default 0.94) */
    pressedScale?: number;
    /** Spring speed (default 200) */
    speed?: number;
    /** Spring bounciness (default 8) */
    bounciness?: number;
    fullWidth?: boolean;

    pressableStyle?: StyleProp<ViewStyle>;
} & Omit<PressableProps, 'style'>;

const PressableScale: React.FC<Props> = ({
    pressableStyle,
    children,
    style,
    pressedScale = 0.95,
    speed = 200,
    bounciness = 8,
    onPressIn,
    onPressOut,
    fullWidth = false,
    ...pressableProps
}) => {
    const scale = useRef(new Animated.Value(1)).current;

    const animate = (to: number) =>
        Animated.spring(scale, {
            toValue: to,
            useNativeDriver: true,
            speed,
            bounciness,
        }).start();

    const animatedStyle = useMemo(
        () => [{ transform: [{ scale }] }, style],
        [scale, style]
    );

    return (
        <Pressable
            {...pressableProps}
            style={[
                {
                    flex: fullWidth ? 1 : undefined,
                },
                pressableStyle,
            ]}
            onPressIn={(e) => {
                animate(pressedScale);
                onPressIn?.(e);
            }}
            onPressOut={(e) => {
                animate(1);
                onPressOut?.(e);
            }}
        >
            <Animated.View style={animatedStyle}>{children}</Animated.View>
        </Pressable>
    );
};

export default PressableScale;
