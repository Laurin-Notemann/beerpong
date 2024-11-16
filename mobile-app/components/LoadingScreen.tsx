import { ActivityIndicator, View } from 'react-native';

import { theme } from '@/theme';

import Text from './Text';

export default function LoadingScreen() {
    return (
        <View
            style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',

                backgroundColor: theme.color.bg,
            }}
        >
            <Text variant="h3" color="secondary">
                <ActivityIndicator />
            </Text>
        </View>
    );
}
