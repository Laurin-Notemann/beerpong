import { Stack } from 'expo-router';
import { ScrollView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { navStyles } from '@/app/navigation/navStyles';
import { theme } from '@/theme';

export default function Page() {
    return (
        <GestureHandlerRootView>
            <Stack.Screen
                options={{
                    ...navStyles,
                    headerTitle: 'About Us',
                }}
            />
            <ScrollView
                style={{
                    flex: 1,

                    backgroundColor: theme.color.bg,
                }}
                contentContainerStyle={{
                    paddingHorizontal: 16,

                    gap: 8,
                }}
            ></ScrollView>
        </GestureHandlerRootView>
    );
}
