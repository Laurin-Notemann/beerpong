import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { navStyles } from '@/app/navigation/navStyles';
import { PremiumPerksCarousel } from '@/components/PremiumPerksCarousel';

export default function Page() {
    return (
        <GestureHandlerRootView>
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
        </GestureHandlerRootView>
    );
}
