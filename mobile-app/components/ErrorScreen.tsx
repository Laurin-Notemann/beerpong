import { View, ViewProps } from 'react-native';

import { theme } from '@/theme';

import Text from './Text';

export interface ErrorScreenProps extends ViewProps {
    message?: string | JSX.Element;
    error?: unknown;
}
export default function ErrorScreen({
    error,
    message = error ? (error as Error).message || 'Unknown error' : undefined,
    ...rest
}: ErrorScreenProps) {
    return (
        <View
            {...rest}
            style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',

                backgroundColor: theme.color.bg,
            }}
        >
            <Text variant="h3" color="negative">
                Error
            </Text>
            {message && (
                <Text
                    variant="body1"
                    color="secondary"
                    style={{
                        marginTop: 16,
                    }}
                >
                    {message}
                </Text>
            )}
        </View>
    );
}
