import { HeaderHeightContext } from 'expo-router/react-navigation';
import { useContext } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Padding for content under the native chrome.
 *
 * - Top: on iOS the header is transparent (Liquid Glass), so content starts below the measured
 *   header height (status bar included). On Android the header is opaque and already pushes the
 *   content down.
 * - Bottom: native tabs give every tab its own safe area that already includes the tab bar on
 *   iOS; on Android native tabs pad the content above the tab bar themselves.
 *
 * Native tabs' automatic scroll view insets are turned off (see app/(main)/(tabs)/_layout.tsx),
 * so every screen goes through this one rule.
 */
export function useInsets(hasHeader = false, hasTabbar = false) {
    const insets = useSafeAreaInsets();
    const headerHeight = useContext(HeaderHeightContext);
    const isIos = Platform.OS === 'ios';

    const top = !hasHeader
        ? insets.top
        : isIos
          ? (headerHeight ?? insets.top + 44)
          : 0;

    const bottom = hasTabbar && !isIos ? 0 : insets.bottom;

    return { ...insets, top, bottom };
}
