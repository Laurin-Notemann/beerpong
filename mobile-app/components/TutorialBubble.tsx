import { useEffect } from 'react';
import { Pressable, Text } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme';

/**
 * A hint that points down at whatever it is rendered in. Put it inside the row it explains:
 * it sits just above that row, scrolls with it and leaves with the screen.
 */
export function TutorialBubble({
    text,
    onPress,
    left = 0,
}: {
    text: string;
    onPress?: () => void;
    /** horizontal offset from the row's left edge */
    left?: number;
}) {
    const theme = useTheme();
    // inverted, so the bubble stands out from the list in both light and dark themes
    const bg = theme.color.text.primary;
    const fg = theme.color.bg;

    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withTiming(1, { duration: 300 });
    }, [progress]);

    const style = useAnimatedStyle(() => ({
        opacity: progress.value,
        transform: [{ translateY: (1 - progress.value) * 8 }],
    }));

    return (
        <Animated.View
            pointerEvents={onPress ? 'auto' : 'none'}
            style={[
                {
                    position: 'absolute',
                    bottom: '100%',
                    left,
                    zIndex: 10,
                    marginBottom: -4,
                },
                style,
            ]}
        >
            <Pressable
                onPress={onPress}
                style={{
                    backgroundColor: bg,
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                }}
            >
                <Text style={{ fontSize: 11, color: fg, fontWeight: '600' }}>
                    {text}
                </Text>
            </Pressable>
            <Svg width={12} height={8} style={{ marginLeft: 16 }}>
                <Path d="M6 8L0 0L12 0Z" fill={bg} />
            </Svg>
        </Animated.View>
    );
}
