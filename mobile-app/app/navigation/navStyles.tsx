import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';

import { theme } from '@/theme';

export const navStyles = {
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
    headerTintColor: 'white',

    headerBackground: () => (
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
    ),
    headerTransparent: true,
};
