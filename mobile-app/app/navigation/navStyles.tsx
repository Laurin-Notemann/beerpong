import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';

import { useTheme } from '@/theme';

export function useNavStyles() {
    const theme = useTheme();

    return {
        headerStyle: {
            backgroundColor: 'transparent',

            elevation: 0, // For Android
            shadowOpacity: 0, // For iOS
            borderBottomWidth: 0, // Removes the border for both platforms
        },
        headerTitleStyle: {
            color: theme.color.text.primary,
        },

        tabBarActiveTintColor: theme.color.text.primary,
        tabBarInactiveTintColor: theme.tabBarInactiveTintColor,
        tabBarStyle: {
            backgroundColor: 'transparent',

            borderTopWidth: 0,
        },
        headerTintColor: theme.color.text.primary,

        headerBackground: () => (
            <BlurView
                intensity={theme.blur?.intensity || 50}
                tint={theme.blur?.tint}
                style={StyleSheet.absoluteFill}
            />
        ),
        headerTransparent: true,
    };
}
