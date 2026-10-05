import { Link, Stack } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import Text from '@/components/Text';
import { useTheme } from '@/theme';

export default function NotFoundScreen() {
    const theme = useTheme();

    return (
        <>
            <Stack.Screen options={{ title: 'Oops!' }} />
            <View
                style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 16,
                    padding: 20,
                    backgroundColor: theme.color.bg,
                }}
            >
                <Text variant="h3" bold>
                    This screen doesn't exist.
                </Text>
                <Link href="/">
                    <Text color="link">Go to home screen</Text>
                </Link>
            </View>
        </>
    );
}
