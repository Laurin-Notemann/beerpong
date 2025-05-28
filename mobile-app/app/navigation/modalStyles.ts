import { useTheme } from '@/theme';

export function useModalStyles(): any {
    const theme = useTheme();
    return {
        presentation: 'modal',

        headerStyle: {
            backgroundColor: theme.panel.dark.bg,

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
        headerTintColor: theme.color.text.primary,
    };
}
