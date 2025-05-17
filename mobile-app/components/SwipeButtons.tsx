import { View } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
} from 'react-native-reanimated';

export const SwipeButtons: React.FC<{
    animationProgress: Animated.SharedValue<number>;

    slot1: React.ReactNode;
    slot2: React.ReactNode;

    right?: boolean;
}> = ({ animationProgress, slot1, slot2, right = false }) => {
    const styleOut = useAnimatedStyle(() => ({
        transform: [
            {
                translateX: interpolate(
                    animationProgress.value,
                    [0, 1],
                    [0, -96]
                ),
            },
        ],
        opacity: interpolate(animationProgress.value, [0, 1], [1, 0]),
    }));

    const styleIn = useAnimatedStyle(() => ({
        transform: [
            {
                translateX: interpolate(
                    animationProgress.value,
                    [0, 1],
                    [96, 0]
                ),
            },
        ],
        opacity: interpolate(animationProgress.value, [0, 1], [0, 1]),
    }));

    return (
        <View
            style={{
                overflow: 'hidden',

                flexDirection: right ? 'row-reverse' : undefined,

                width: 96,
                height: 22,
            }}
        >
            <Animated.View
                style={[
                    {
                        position: 'absolute',
                    },
                    styleOut,
                ]}
            >
                {slot1}
            </Animated.View>
            <Animated.View
                style={[
                    {
                        position: 'absolute',
                    },
                    styleIn,
                ]}
            >
                {slot2}
            </Animated.View>
        </View>
    );
};
