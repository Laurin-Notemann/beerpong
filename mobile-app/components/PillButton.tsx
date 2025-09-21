import { BlurView } from 'expo-blur';
import React, { useMemo, useRef } from 'react';
import {
    Animated,
    Pressable,
    StyleSheet,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import Text from '@/components/Text';
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

    const theme = useTheme();

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
                        ? theme.button.primary
                        : hasBlur
                          ? undefined
                          : backgroundColor,

                    borderRadius: 16,
                } as ViewStyle,
            }),
        [removable, iconName, hasBlur, backgroundColor, theme]
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

                                    backgroundColor:
                                        theme.overlay.backgroundColor,
                                },
                            ]}
                        >
                            {iconName && (
                                <Icon
                                    color={
                                        removable
                                            ? 'white'
                                            : theme.color.text.primary
                                    }
                                    size={20}
                                    name={iconName}
                                    style={{
                                        marginRight: 4,
                                    }}
                                />
                            )}
                            <Text
                                variant="fineprint"
                                bold
                                style={{
                                    color: removable
                                        ? 'white'
                                        : theme.color.text.primary,
                                }}
                            >
                                {label}
                            </Text>
                            {removable && (
                                <TouchableOpacity
                                    onPress={onRemove}
                                    activeOpacity={0.4}
                                >
                                    <Icon
                                        color="#9FBAF7"
                                        size={16}
                                        name="close"
                                        style={{
                                            paddingVertical: 8,
                                            paddingLeft: 6,
                                            paddingRight: 8,
                                        }}
                                    />
                                </TouchableOpacity>
                            )}
                        </BlurView>
                    ) : (
                        <>
                            {iconName && (
                                <Icon
                                    color={
                                        removable
                                            ? 'white'
                                            : theme.color.text.primary
                                    }
                                    size={20}
                                    name={iconName}
                                    style={{
                                        marginRight: 4,
                                    }}
                                />
                            )}
                            <Text
                                variant="fineprint"
                                bold
                                style={{
                                    color: removable
                                        ? 'white'
                                        : theme.color.text.primary,
                                }}
                            >
                                {label}
                            </Text>
                            {removable && (
                                <TouchableOpacity
                                    onPress={onRemove}
                                    activeOpacity={0.4}
                                >
                                    <Icon
                                        color="rgba(255,255,255,0.7)"
                                        size={16}
                                        name="close"
                                        style={{
                                            paddingVertical: 8,
                                            paddingLeft: 6,
                                            paddingRight: 8,
                                        }}
                                    />
                                </TouchableOpacity>
                            )}
                        </>
                    )}
                </View>
            </Animated.View>
        </Pressable>
    );
};
export default PillButton;
