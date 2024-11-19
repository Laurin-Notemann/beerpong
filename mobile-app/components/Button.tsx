import {
    Text,
    TouchableHighlight,
    TouchableHighlightProps,
} from 'react-native';

import { theme } from '@/theme';

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
    const style = (
        {
            default: {
                backgroundColor: '#2E2E2E',
                color: theme.color.text.primary,
                active: theme.panel.light.active,
            },
            primary: {
                backgroundColor: '#2C6BED',
                color: theme.color.text.primary,
                active: '#2C58B3',
            },
            secondary: {
                backgroundColor: '#1B1B1B',
                color: '#2C6BED',
                active: '#202020',
            },
        } as const
    )[variant];

    return (
        <TouchableHighlight
            {...rest}
            disabled={disabled}
            onPress={onPress}
            style={[
                rest.style,
                {
                    alignItems: 'center',
                    justifyContent: 'center',

                    height: size === 'large' ? 52 : 42,

                    borderRadius: size === 'large' ? 5 : 10,
                    backgroundColor: disabled ? '#666' : style.backgroundColor,

                    alignSelf: 'stretch',
                },
            ]}
            underlayColor={style.active}
        >
            {typeof title === 'string' ? (
                <Text
                    style={{
                        fontSize: 17,
                        fontWeight: 600,

                        color: disabled
                            ? theme.color.text.secondary
                            : style.color,
                    }}
                >
                    {title}
                </Text>
            ) : (
                title
            )}
        </TouchableHighlight>
    );
}
