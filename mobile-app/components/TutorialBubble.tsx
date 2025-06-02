import { useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Animated } from 'react-native';
import { Portal } from 'react-native-portalize';
import Svg, { Path } from 'react-native-svg';

// this doesn't work at all lol
function useIsOnScreen() {
    const nav = useNavigation();

    const [isOnScreen, setIsOnScreen] = useState(nav.isFocused());

    nav.addListener('blur', () => {
        setIsOnScreen(false);
    });
    nav.addListener('focus', () => {
        setIsOnScreen(true);
    });

    return isOnScreen;
}

export const TutorialBubble: React.FC<{
    text: string;
    onPress?: () => void;

    top?: number;
    left?: number;
}> = ({ text, onPress, top, left }) => {
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

    const parentRef = useRef<View>(null);
    const [coords, setCoords] = useState({ x: 0, y: 0 });

    useEffect(() => {
        setTimeout(() => {
            parentRef.current?.measureInWindow((x, y) => setCoords({ x, y }));
        }, 0);
    }, []);

    useEffect(() => {
        let mounted = true;
        const loop = () => {
            parentRef.current?.measureInWindow((x, y) => {
                if (mounted) setCoords({ x, y });
            });
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
        return () => {
            mounted = false;
        };
    }, []);

    const isOnScreen = useIsOnScreen();

    const isOffScreen = coords.x === 0 && coords.y === 0;

    return (
        <View
            ref={parentRef}
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
            }}
        >
            {isOnScreen && !isOffScreen && (
                <Portal>
                    <Animated.View
                        style={{
                            position: 'absolute',
                            top: coords.y + (top ?? 0),
                            left: coords.x + (left ?? 0),
                            opacity,
                            transform: [{ translateY }],
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
                                style={{
                                    position: 'absolute',
                                    bottom: -12,
                                    left: '50%',
                                }}
                            >
                                <Path
                                    d="M6 9L0.803848 0L11.1962 0L6 9Z"
                                    fill="#fff"
                                />
                            </Svg>
                        </Pressable>
                    </Animated.View>
                </Portal>
            )}
        </View>
    );
};
