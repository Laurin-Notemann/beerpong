import React, { useMemo, useRef } from 'react';
import {
    Animated,
    Pressable,
    StyleSheet,
    TextStyle,
    ViewStyle,
} from 'react-native';
import { Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const PillButton: React.FC<{
    label: string;
    iconName?: string;
    onPress?: () => void;
    onRemove?: () => void;
}> = ({ label, iconName, onPress, onRemove }) => {
    const scale = useRef(new Animated.Value(1)).current;

    const removable = typeof onRemove === 'function';

    const styles = useMemo(
        () =>
            StyleSheet.create({
                container: {
                    flexDirection: 'row',
                    alignItems: 'center',

                    height: 32,
                    paddingLeft: iconName ? 8 : 16,
                    paddingRight: removable ? 0 : 16,

                    borderRadius: 16,

                    backgroundColor: removable ? '#2C70FA' : '#333',
                } as ViewStyle,
                label: {
                    fontSize: 12,
                    color: '#fff',
                    fontWeight: '700',
                } as TextStyle,
            }),
        [removable, iconName]
    );

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
                style={[styles.container, { transform: [{ scale }] }]}
            >
                {iconName && (
                    <Icon
                        color="#fff"
                        size={20}
                        name={iconName}
                        style={{
                            marginRight: 4,
                        }}
                    />
                )}
                <Text style={styles.label}>{label}</Text>
                {removable && (
                    <Icon
                        onPress={onRemove}
                        color="#9FBAF7"
                        size={16}
                        name="close"
                        style={{
                            paddingVertical: 8,
                            paddingLeft: 6,
                            paddingRight: 8,
                        }}
                    />
                )}
            </Animated.View>
        </Pressable>
    );
};
export default PillButton;
