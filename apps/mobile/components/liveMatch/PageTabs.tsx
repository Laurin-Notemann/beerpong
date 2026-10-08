import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
    interpolate,
    SharedValue,
    useAnimatedStyle,
} from 'react-native-reanimated';

import { useNextTokens } from '@/components/next/tokens';
import { useSwiperPage } from '@/hooks/useSwiperPage';

const HEIGHT = 32;
const INSET = 3;

function Label({
    title,
    index,
    progress,
    selected,
    onPress,
}: {
    title: string;
    index: number;
    progress: SharedValue<number>;
    selected: boolean;
    onPress: () => void;
}) {
    const t = useNextTokens();
    // the active page's label is solid, the other one dimmed, blending while swiping
    const style = useAnimatedStyle(() => ({
        opacity: interpolate(
            Math.abs(progress.value - index),
            [0, 1],
            [1, 0.55],
            'clamp'
        ),
    }));

    return (
        <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={onPress}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
            <Animated.Text
                style={[
                    { color: t.text, fontSize: 14, fontWeight: '600' },
                    style,
                ]}
            >
                {title}
            </Animated.Text>
        </Pressable>
    );
}

/**
 * Tabs for the pages of a `Swiper`. The highlight follows the swipe exactly (it is driven by
 * the swiper's progress, not animated on its own); tapping a tab goes to its page.
 */
export function PageTabs({
    titles,
    progress,
    onSelect,
}: {
    titles: string[];
    progress: SharedValue<number>;
    onSelect: (index: number) => void;
}) {
    const t = useNextTokens();
    const [width, setWidth] = useState(0);
    const page = useSwiperPage(progress);
    const segment = titles.length ? (width - INSET * 2) / titles.length : 0;

    const highlight = useAnimatedStyle(() => ({
        transform: [{ translateX: progress.value * segment }],
    }));

    return (
        <View
            accessibilityRole="tablist"
            onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
            style={{
                alignSelf: 'center',
                width: '100%',
                maxWidth: 110 * titles.length,
                height: HEIGHT,
                padding: INSET,
                flexDirection: 'row',
                borderRadius: HEIGHT / 2,
                backgroundColor: t.hairline,
            }}
        >
            {segment > 0 && (
                <Animated.View
                    style={[
                        {
                            position: 'absolute',
                            top: INSET,
                            left: INSET,
                            width: segment,
                            height: HEIGHT - INSET * 2,
                            borderRadius: (HEIGHT - INSET * 2) / 2,
                            // on dark the plain surface would vanish into the track
                            backgroundColor: t.isLight
                                ? t.surface
                                : t.surfacePressed,
                            shadowColor: '#000',
                            shadowOpacity: t.isLight ? 0.08 : 0,
                            shadowRadius: 4,
                            shadowOffset: { width: 0, height: 1 },
                        },
                        highlight,
                    ]}
                />
            )}
            {titles.map((title, index) => (
                <Label
                    key={title}
                    title={title}
                    index={index}
                    progress={progress}
                    selected={index === page}
                    onPress={() => onSelect(index)}
                />
            ))}
        </View>
    );
}
