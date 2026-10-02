import { isLiquidGlassAvailable } from 'expo-glass-effect';
import type { NativeStackNavigationOptions } from 'expo-router';
import { Platform } from 'react-native';

import { useTheme } from '@/theme';

/**
 * Native, translucent header shared by every stack screen: Liquid Glass on iOS 26+,
 * the system chrome blur on older iOS, and an opaque bar on Android.
 */
export function useNavStyles() {
    const theme = useTheme();
    const isIos = Platform.OS === 'ios';

    return {
        headerTransparent: isIos,
        headerBlurEffect:
            isIos && !isLiquidGlassAvailable()
                ? 'systemChromeMaterial'
                : undefined,
        headerShadowVisible: false,
        headerStyle: isIos ? undefined : { backgroundColor: theme.color.bg },
        headerTitleStyle: { color: theme.color.text.primary },
        headerTintColor: theme.color.text.primary,
        headerBackButtonDisplayMode: 'minimal',
    } satisfies NativeStackNavigationOptions;
}
