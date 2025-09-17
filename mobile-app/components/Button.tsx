import { useRef } from 'react';
import {
    Animated,
    Text,
    TouchableHighlight,
    TouchableHighlightProps,
} from 'react-native';

import { useTheme } from '@/theme';

export interface ButtonProps extends TouchableHighlightProps {
    title: JSX.Element | string;

    variant?: 'default' | 'primary' | 'secondary';
    size?: 'small' | 'large';

    onPress: () => void;

    disabled?: boolean;
}
export default function Button({
    title,
    variant = 'default',
    size = 'small',

    onPress,

    disabled = false,

    ...rest
}: ButtonProps) {
    const scale = useRef(new Animated.Value(1)).current;

    const animate = (to: number) =>
        Animated.spring(scale, {
            toValue: to,
            useNativeDriver: true,
            speed: 200,
            bounciness: 8,
        }).start();

    const theme = useTheme();

    const style = (
        {
            default: {
                backgroundColor: theme.panel.light.bg,
                color: theme.color.text.primary,
                active: theme.panel.light.active,
            },
            primary: {
                backgroundColor: '#2C6BED',
                color: 'white',
                active: '#2C58B3',
            },
            secondary: {
                backgroundColor: theme.panel.dark.bg,
                color: '#2C6BED',
                active: theme.panel.dark.active,
            },
        } as const
    )[variant];

    return (
        <TouchableHighlight
            {...rest}
            disabled={disabled}
            onPressIn={() => animate(0.98)}
            onPressOut={() => animate(1)}
            onPress={onPress}
        >
            <Animated.View
                style={[
                    rest.style,
                    {
                        alignItems: 'center',
                        justifyContent: 'center',

                        height: size === 'large' ? 52 : 42,

                        borderRadius: size === 'large' ? 5 : 10,
                        backgroundColor: disabled
                            ? '#222'
                            : style.backgroundColor,

                        alignSelf: 'stretch',

                        paddingHorizontal: 16,
                    },
                    {
                        transform: [{ scale }],
                    },
                ]}
            >
                {typeof title === 'string' ? (
                    <Text
                        style={{
                            fontSize: 17,
                            fontWeight: 600,

                            color: disabled ? '#444' : style.color,
                        }}
                    >
                        {title}
                    </Text>
                ) : (
                    title
                )}
            </Animated.View>
        </TouchableHighlight>
    );
}
