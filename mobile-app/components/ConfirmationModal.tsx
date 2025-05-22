import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableHighlight,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

import { theme } from '@/theme';

const DarkBackdrop: React.FC<{
    opacity: Animated.Value;
    onPress: () => void;
}> = ({ opacity, onPress }) => {
    return (
        <TouchableWithoutFeedback onPress={onPress}>
            <Animated.View
                style={[
                    StyleSheet.absoluteFillObject,
                    { backgroundColor: 'black', opacity },
                ]}
            />
        </TouchableWithoutFeedback>
    );
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface ConfirmationModalProps {
    isVisible?: boolean;
    onClose?: () => void;
    title: string;
    description?: string;
    header?: boolean;
    actions: {
        type?: 'default' | 'confirm' | 'danger';
        title: string;
        onPress: () => void;
    }[];
}

export default function ConfirmationModal({
    isVisible = false,
    onClose = () => {},
    title,
    description,
    actions,
    header = true,
}: ConfirmationModalProps) {
    const [show, setShow] = useState(isVisible);
    const fade = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    useEffect(() => {
        if (isVisible) {
            setShow(true);
            Animated.parallel([
                Animated.timing(fade, {
                    toValue: 0.5,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    duration: 150,
                    toValue: 0,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fade, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: SCREEN_HEIGHT,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start(() => setShow(false));
        }
    }, [isVisible, fade, translateY]);

    return (
        <Modal
            transparent
            visible={show}
            animationType="none"
            onRequestClose={onClose}
        >
            <DarkBackdrop opacity={fade} onPress={onClose} />

            <Animated.View
                style={[styles.sheetContainer, { transform: [{ translateY }] }]}
            >
                <SafeAreaView style={styles.sheet}>
                    {header && (
                        <View style={styles.header}>
                            <Text style={styles.title}>{title}</Text>
                            {description && (
                                // max 15 lines + half a line of peek so the user realizes they can scroll
                                <ScrollView style={{ maxHeight: 22 * 15 + 11 }}>
                                    <Text style={styles.description}>
                                        {description}
                                    </Text>
                                </ScrollView>
                            )}
                        </View>
                    )}

                    {actions.map((action, i) => (
                        <TouchableHighlight
                            key={i}
                            style={[
                                styles.action,
                                i === actions.length - 1 && styles.lastAction,
                            ]}
                            underlayColor="#4A4A4A"
                            onPress={action.onPress}
                        >
                            <Text
                                style={[
                                    styles.actionText,
                                    {
                                        color:
                                            action.type === 'danger'
                                                ? theme.color.delete
                                                : action.type === 'confirm'
                                                  ? theme.color.confirm
                                                  : theme.color.text.primary,
                                    },
                                ]}
                            >
                                {action.title}
                            </Text>
                        </TouchableHighlight>
                    ))}
                </SafeAreaView>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    sheetContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    sheet: {
        backgroundColor: theme.panel.light.active,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        overflow: 'hidden',
    },
    header: {
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 18,
    },
    title: {
        fontSize: 15,
        lineHeight: 22,
        fontWeight: '500',
        color: theme.color.text.primary,
        textAlign: 'center',
    },
    description: {
        fontSize: 15,
        lineHeight: 22,
        fontWeight: '400',
        color: theme.color.text.primary,
        textAlign: 'center',
    },
    action: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 61,
        paddingHorizontal: 16,
        borderTopWidth: 0.5,
        borderColor: '#4A4A4A',
    },
    lastAction: {
        borderBottomWidth: 0.5,
    },
    actionText: {
        fontSize: 17,
        lineHeight: 22,
        fontWeight: '500',
        paddingHorizontal: 16,
        paddingVertical: 9,
    },
});
