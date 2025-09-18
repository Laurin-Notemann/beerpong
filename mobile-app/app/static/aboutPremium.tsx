import { Stack } from 'expo-router';
import { View } from 'react-native';

import { AppBackground } from '@/app/Background';
import { useNavStyles } from '@/app/navigation/navStyles';
import { useInsets } from '@/app/useInsets';
import { PremiumPerksCarousel } from '@/components/PremiumPerksCarousel';
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
