import { BlurView } from 'expo-blur';
import React, { useMemo, useRef } from 'react';
import {
    Animated,
    Pressable,
    StyleSheet,
    TextStyle,
    View,
    ViewStyle,
} from 'react-native';
import { Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/theme';

const PillButton: React.FC<{
    label: string;
    iconName?: string;
    onPress?: () => void;
    onRemove?: () => void;
    backgroundColor?: string;
    blur?: boolean;
    style?: any;
}> = ({
    label,
    iconName,
    onPress,
    onRemove,
    blur = false,
    backgroundColor = '#333',
    style,
}) => {
    const scale = useRef(new Animated.Value(1)).current;

    const removable = typeof onRemove === 'function';

    const hasBlur = blur && !removable;

    const styles = useMemo(
        () =>
            StyleSheet.create({
                container: {
                    flexDirection: 'row',
                    alignItems: 'center',

                    height: 32,
                    paddingLeft: hasBlur ? undefined : iconName ? 8 : 16,
                    paddingRight: hasBlur ? undefined : removable ? 0 : 16,

                    backgroundColor: removable
                        ? '#2C70FA'
                        : hasBlur
                          ? undefined
                          : backgroundColor,

                    borderRadius: 16,
                } as ViewStyle,
                label: {
                    fontSize: 12,
                    color: '#fff',
                    fontWeight: '700',
                } as TextStyle,
            }),
        [removable, iconName, hasBlur, backgroundColor]
    );

    const animate = (to: number) =>
        Animated.spring(scale, {
            toValue: to,
            useNativeDriver: true,
            speed: 200,
            bounciness: 8,
        }).start();

    const theme = useTheme();

    return (
        <Pressable
            onPressIn={() => animate(0.94)} // shrink a bit
            onPressOut={() => animate(1)} // unshrink
            onPress={onPress}
            {...(style ?? {})}
        >
            <Animated.View
                style={[styles.container, { transform: [{ scale }] }]}
            >
                <View
                    style={{
                        borderRadius: 16,

                        flexDirection: 'row',
                        alignItems: 'center',

                        height: 32,

                        overflow: 'hidden',
                    }}
                >
                    {hasBlur ? (
                        <BlurView
                            intensity={70}
                            tint={theme.blur.tint}
                            style={[
                                {
                                    flexDirection: 'row',
                                    alignItems: 'center',

                                    height: 32,

                                    paddingLeft: iconName ? 8 : 16,
                                    paddingRight: removable ? 0 : 16,
                                },
                            ]}
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
                        </BlurView>
                    ) : (
                        <>
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
                        </>
                    )}
                </View>
            </Animated.View>
        </Pressable>
    );
};
export default PillButton;
