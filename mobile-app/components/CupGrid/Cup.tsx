import {
    Gesture,
    GestureDetector,
    GestureType,
} from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';

const MOVEMENT_ANIMATION_DURATION_MS = 0;

export interface CupProps {
    disabled?: boolean;
    color: string;
    x: number;
    y: number;
    width: number;
    onPan?: GestureType;
    onTap?: GestureType;
}

export function Cup({
    disabled = false,
    color,
    x,
    y,
    width,
    onPan,
    onTap,
}: CupProps) {
    const animatedStyle = useAnimatedStyle(() => ({
        left: withSpring(x, {
            duration: MOVEMENT_ANIMATION_DURATION_MS,
        }),
        top: withSpring(y, {
            duration: MOVEMENT_ANIMATION_DURATION_MS,
        }),
        // to always put the cups in the lower rows over the upper ones for consistency
        zIndex: y,
    }));
    const gestures = disabled ? [] : [onPan, onTap].filter((i) => i != null);

    return (
        <GestureDetector gesture={Gesture.Race(...gestures)}>
            <Animated.View
                style={[
                    {
                        position: 'absolute',
                        width: width,
                        height: width,

                        backgroundColor: disabled ? '#2E2E2E' : color,
                        borderColor: '#222',

                        borderRadius: width / 2,
                        borderWidth: disabled ? 0 : width / 16,
                    },
                    animatedStyle,
                ]}
            />
        </GestureDetector>
    );
}
