import { Text, View, ViewProps } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { theme } from '@/theme';

export interface IconHeadProps extends ViewProps {
    iconName: string;
    title: JSX.Element | string;
    description?: JSX.Element | string;
}
export default function IconHead({
    iconName,
    title,
    description,
    ...rest
}: IconHeadProps) {
    return (
        <View
            {...rest}
            style={[
                rest.style,
                {
                    alignItems: 'center',
                    gap: 10,
                },
            ]}
        >
            <Icon
                name={iconName}
                size={60}
                color={theme.color.text.secondary}
            />
            <Text
                style={{
                    fontSize: 22,

                    fontWeight: 'bold',

                    color: theme.color.text.primary,

                    textAlign: 'center',
                }}
            >
                {title}
            </Text>
            <View
                style={{
                    width: 288,
                }}
            >
                {typeof description !== 'string' ? (
                    description
                ) : (
                    <Text
                        style={{
                            fontSize: 15,
                            lineHeight: 20,

                            color: theme.color.text.secondary,

                            textAlign: 'center',

                            width: 288,
                        }}
                    >
                        {description}
                    </Text>
                )}
            </View>
        </View>
    );
}
