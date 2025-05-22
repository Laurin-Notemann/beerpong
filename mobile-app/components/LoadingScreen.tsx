import { ActivityIndicator, View } from 'react-native';

import Text from '@/components/Text';
import { theme } from '@/theme';

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
