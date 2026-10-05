import type React from 'react';
import { View, ViewProps } from 'react-native';

import Text from '@/components/Text';
import { useTheme } from '@/theme';
import { describeError } from '@/toast';

export interface ErrorScreenProps extends ViewProps {
    message?: string | React.JSX.Element;
    error?: unknown;
}
export default function ErrorScreen({
    error,
    message = error
        ? (describeError(error) ??
          ((error as Error).message || 'Unknown error'))
        : undefined,
    ...rest
}: ErrorScreenProps) {
    const theme = useTheme();

    return (
        <View
            {...rest}
            style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 16,

                backgroundColor: theme.color.bg,
            }}
        >
            <Text variant="h3" color="negative">
                Something went wrong
            </Text>
            {message && (
                <Text
                    variant="body1"
                    color="secondary"
                    style={{
                        marginTop: 16,
                        paddingHorizontal: 32,
                        textAlign: 'center',
                    }}
                >
                    {message}
                </Text>
            )}
        </View>
    );
}
