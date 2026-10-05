import { BlurView } from 'expo-blur';
import React from 'react';
import { Animated, StyleSheet, TouchableWithoutFeedback } from 'react-native';

/** Full-screen blur behind an overlay (e.g. the enlarged avatar); tapping it closes the overlay. */
export const BlurredBackdrop: React.FC<{
    opacity: Animated.Value;
    onPress: () => void;
}> = ({ opacity, onPress }) => {
    return (
        <TouchableWithoutFeedback onPress={onPress}>
            <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}>
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
