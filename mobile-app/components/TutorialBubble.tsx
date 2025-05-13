import { useEffect, useRef } from 'react';
import { Pressable, Text } from 'react-native';
import { Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export const TutorialBubble: React.FC<{
    text: string;
    onPress?: () => void;
}> = ({ text, onPress }) => {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(8)).current; // start 8px lower

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={{
                position: 'absolute',
                top: -12,
                left: 8,
                opacity,
                transform: [{ translateY }],
                elevation: 999999,
                backgroundColor: '#fff',
                borderRadius: 4,
                paddingHorizontal: 8,
                paddingVertical: 4,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
            }}
        >
            <Pressable onPress={onPress}>
                <Text
                    style={{
                        fontSize: 10,
                        color: '#000',
                        fontWeight: 'semibold',
                    }}
                >
                    {text}
                </Text>
                <Svg
                    width={12}
                    height={12}
                    style={{ position: 'absolute', bottom: -12, left: '50%' }}
                >
                    <Path d="M6 9L0.803848 0L11.1962 0L6 9Z" fill="#fff" />
                </Svg>
            </Pressable>
        </Animated.View>
    );
};
