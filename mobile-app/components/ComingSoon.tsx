import { View } from 'react-native';

import Text from '@/components/Text';
import { theme } from '@/theme';

export default function ComingSoon() {
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
                Coming soon
            </Text>
        </View>
    );
}
