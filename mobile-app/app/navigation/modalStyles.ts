import { theme } from '@/theme';

export const modalStyles: any = {
    presentation: 'modal',

    headerStyle: {
        backgroundColor: '#1B1B1B',

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
        backgroundColor: theme.color.bottomNav,

        borderTopWidth: 0,
    },
    headerTintColor: 'white',
};
