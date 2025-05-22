import React, { useRef } from 'react';
import {
    Animated,
    Pressable,
    StyleSheet,
    TextStyle,
    ViewStyle,
} from 'react-native';
import { Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const styles = StyleSheet.create({
    container: {
        height: 32,
        backgroundColor: '#333',
        borderRadius: 16,
        paddingLeft: 8,
        paddingRight: 16,
        alignItems: 'center',
        flexDirection: 'row',
    } as ViewStyle,
    label: {
        fontSize: 12,
        color: '#fff',
        marginLeft: 4,
        fontWeight: '700',
    } as TextStyle,
});

const PillButton: React.FC<{
    label: string;
    iconName: string;
    onPress?: () => void;
    small?: boolean;
}> = ({ label, iconName, onPress, small = false }) => {
    const scale = useRef(new Animated.Value(1)).current;

    const animate = (to: number) =>
        Animated.spring(scale, {
            toValue: to,
            useNativeDriver: true,
            speed: 200,
            bounciness: 8,
        }).start();

    return (
        <Pressable
            onPressIn={() => animate(0.94)} // shrink a bit
            onPressOut={() => animate(1)} // unshrink
            onPress={onPress}
        >
            <Animated.View
                style={[
                    styles.container,
                    {
                        height: small ? 26 : 32,
                        paddingRight: small ? 8 : 16,
                        paddingLeft: small ? 4 : 8,
                    },
                    { transform: [{ scale }] },
                ]}
            >
                <Icon color="#fff" size={20} name={iconName} />
                <Text style={styles.label}>{label}</Text>
            </Animated.View>
        </Pressable>
    );
};
export default PillButton;
