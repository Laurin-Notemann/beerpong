import { Stack } from 'expo-router';
import { View } from 'react-native';

import { PremiumPerksCarousel } from '@/components/PremiumPerksCarousel';
import { AppBackground } from '@/lib/Background';
import { useNavStyles } from '@/lib/navigation/navStyles';
import { useInsets } from '@/lib/useInsets';
import { useTheme } from '@/theme';

export default function Page() {
    const insets = useInsets(true);

    const theme = useTheme();

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
                    ...useNavStyles(),
                    headerTitle: 'About Premium',
                }}
            />
            <AppBackground />
            <PremiumPerksCarousel
                onGetPremiumPress={() => {}}
                onSecondaryActionPress={() => {}}
            />
        </View>
    );
}
