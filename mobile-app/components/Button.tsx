import { BlurView } from 'expo-blur';
import { Text, TouchableHighlightProps, View } from 'react-native';

import PressableScale from '@/components/PressableScale';
import { useTheme } from '@/theme';

export interface ButtonProps extends TouchableHighlightProps {
    title: JSX.Element | string;

    variant?: 'default' | 'primary' | 'secondary';
    size?: 'small' | 'large';

    onPress: () => void;

    disabled?: boolean;

    blur?: boolean;
}
export default function Button({
    title,
    variant = 'default',
    size = 'small',

    onPress,

    disabled = false,

    blur = false,

    ...rest
}: ButtonProps) {
    const theme = useTheme();

    const style = (
        {
            default: {
                backgroundColor: theme.panel.light.bg,
                color: theme.color.text.primary,
                active: theme.panel.light.active,
            },
            primary: {
                backgroundColor: theme.button.primary,
                color: 'white',
                active: theme.button.primaryActive,
            },
            secondary: {
                backgroundColor: theme.panel.dark.bg,
                color: theme.button.primary,
                active: theme.panel.dark.active,
            },
        } as const
    )[variant];

    return (
        <PressableScale
            {...rest}
            disabled={disabled}
            pressedScale={0.95}
            onPress={onPress}
        >
            {blur ? (
                <BlurView
                    intensity={70}
                    tint={theme.blur.tint}
                    style={[
                        rest.style,
                        {
                            alignItems: 'center',
                            justifyContent: 'center',

                            height: size === 'large' ? 52 : 42,

                            borderRadius: size === 'large' ? 5 : 10,

                            alignSelf: 'stretch',

                            paddingHorizontal: 16,

                            backgroundColor: theme.overlay.backgroundColor,
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
                </BlurView>
            ) : (
                <View
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
                </View>
            )}
        </PressableScale>
    );
}
