import { BlurView } from 'expo-blur';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Modal,
    Pressable,
    SafeAreaView,
    StyleSheet,
    TouchableWithoutFeedback,
} from 'react-native';

import { useTheme } from '@/theme';

export const BlurredBackdrop: React.FC<{
    opacity: Animated.Value;
    onPress: () => void;
}> = ({ opacity, onPress }) => {
    return (
        <TouchableWithoutFeedback onPress={onPress}>
            <Animated.View style={[StyleSheet.absoluteFillObject, { opacity }]}>
                <BlurView
                    intensity={50}
                    tint="dark"
                    style={{
                        width: '100%',
                        height: '100%',
                    }}
                />
            </Animated.View>
        </TouchableWithoutFeedback>
    );
};

export const LongPressModal: React.FC<any> = ({
    isVisible = false,
    onClose = () => {},
    content,
    onPress = () => {},
}) => {
    const theme = useTheme();
    const [show, setShow] = useState(isVisible);
    const fade = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0)).current;

    const styles = useMemo(
        () =>
            StyleSheet.create({
                sheet: {
                    backgroundColor: theme.color.bg,
                    borderRadius: 16,
                    overflow: 'hidden',

                    marginHorizontal: 13,
                },
            }),
        [theme]
    );

    useEffect(() => {
        if (isVisible) {
            setShow(true);
            Animated.parallel([
                Animated.timing(fade, {
                    toValue: 1,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(scale, {
                    duration: 100,
                    toValue: 1,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fade, {
                    toValue: 0,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(scale, {
                    toValue: 0,
                    duration: 100,
                    useNativeDriver: true,
                }),
            ]).start(() => setShow(false));
        }
    }, [isVisible, fade, scale]);

    return (
        <Modal
            transparent
            visible={show}
            animationType="none"
            onRequestClose={onClose}
        >
            <BlurredBackdrop opacity={fade} onPress={onClose} />

            <Animated.View
                style={[
                    {
                        marginVertical: 'auto',
                    },
                    { transform: [{ scale }], opacity: scale },
                ]}
            >
                <Pressable onPress={onPress} style={{ width: '100%' }}>
                    <SafeAreaView style={styles.sheet}>{content}</SafeAreaView>
                </Pressable>
            </Animated.View>
        </Modal>
    );
};
