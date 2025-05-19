import { Stack } from 'expo-router';
import { View } from 'react-native';

import { navStyles } from '@/app/navigation/navStyles';
import { PremiumPerksCarousel } from '@/components/PremiumPerksCarousel';
import { theme } from '@/theme';

export default function Page() {
    return (
        <View
            style={{
                flex: 1,
                paddingTop: 32,
                backgroundColor: theme.color.bg,
            }}
        >
            <Stack.Screen
                options={{
                    ...navStyles,
                    headerTitle: 'About Premium',
                }}
            />
            <PremiumPerksCarousel
                onGetPremiumPress={() => {}}
                onSecondaryActionPress={() => {}}
            />
        </View>
    );
}
