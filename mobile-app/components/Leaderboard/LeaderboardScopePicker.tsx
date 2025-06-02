import { BlurView } from 'expo-blur';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useDerivedValue,
    withSpring,
} from 'react-native-reanimated';

import Text from '@/components/Text';
import { useTheme } from '@/theme';

export interface LeaderboardScopePickerProps {
    swiperProgress: Animated.SharedValue<number>;

    options: { id: string; label: string }[];

    onChange: (value: string) => void;
}
export const LeaderboardScopePicker: React.FC<LeaderboardScopePickerProps> = ({
    swiperProgress,
    onChange,
    options,
}) => {
    const sidePadding = 8;

    const containerRef = useRef<View>(null);

    const [containerWidth, setContainerWidth] = useState(0);

    const segmentWidth = (containerWidth - sidePadding * 2) / options.length;

    const targetX = useDerivedValue(
        () =>
            withSpring(swiperProgress.value * segmentWidth + sidePadding, {
                duration: 100,
            }),
        [swiperProgress, segmentWidth]
    );

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: targetX.value }],
    }));

    const theme = useTheme();

    const styles = useMemo(
        () =>
            StyleSheet.create({
                container: {
                    flexDirection: 'row',

                    height: 48,

                    // backgroundColor: theme.panel.dark.bg, // '#141414'

                    borderRadius: 99,

                    overflow: 'hidden',
                },
                active: {
                    position: 'absolute',

                    top: 8,

                    // backgroundColor: theme.panel.dark.active, // '#2E2E30'

                    backgroundColor: 'white',

                    opacity: 0.1,

                    borderRadius: 99,

                    width: segmentWidth,

                    height: 32,
                },
                tab: {
                    alignItems: 'center',
                    justifyContent: 'center',

                    flex: 1,

                    height: '100%',
                },
            }),
        [segmentWidth, theme]
    );

    return (
        <View
            ref={containerRef}
            style={styles.container}
            onLayout={() => {
                containerRef.current?.measure((x, y, width, height) => {
                    setContainerWidth(width);
                });
            }}
        >
            <BlurView
                intensity={70}
                tint={theme.blur.tint}
                style={{
                    flexDirection: 'row',

                    width: '100%',
                    height: '100%',
                }}
            >
                <Animated.View style={[styles.active, animatedStyle]} />
                {options.map((option) => (
                    <Pressable
                        key={option.id}
                        style={styles.tab}
                        onPress={() => onChange(option.id)}
                    >
                        <Text
                            color="primary"
                            style={{
                                fontSize: 13,
                                fontWeight: 600,
                            }}
                        >
                            {option.label}
                        </Text>
                    </Pressable>
                ))}
            </BlurView>
        </View>
    );
};
