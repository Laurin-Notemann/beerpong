import { View } from 'react-native';

import { theme } from '@/theme';

import Text from './Text';

export interface ErrorScreenProps {
    message?: string;
}
export default function ErrorScreen({ message }: ErrorScreenProps) {
    return (
        <View
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
