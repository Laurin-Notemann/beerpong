import { Stack } from 'expo-router';
import { View } from 'react-native';

import { navStyles } from '@/app/navigation/navStyles';
import { useInsets } from '@/app/useInsets';
import { PremiumPerksCarousel } from '@/components/PremiumPerksCarousel';
import { theme } from '@/theme';

export default function Page() {
    const insets = useInsets(true);

    return (
        <View
            style={{
                flex: 1,
                paddingTop: insets.top + 32,
                paddingBottom: insets.bottom,
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
