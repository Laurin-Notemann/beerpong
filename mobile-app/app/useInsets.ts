import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useInsets(
    hasHeader = false,
    hasTabbar = false,
    isWeirdAfterSwitchingToNewSafeAreaAPI = false
) {
    const insets = useSafeAreaInsets();

    return {
        ...insets,
        top: hasHeader ? insets.top + 42 : insets.top,
        bottom:
            (hasTabbar ? insets.bottom + 45 : insets.bottom) -
            (isWeirdAfterSwitchingToNewSafeAreaAPI ? 34 : 0),
    };
}
