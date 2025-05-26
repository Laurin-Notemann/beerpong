import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useInsets(hasHeader = false, hasTabbar = false) {
    const insets = useSafeAreaInsets();

    return {
        ...insets,
        top: hasHeader ? insets.top + 39 : insets.top,
        bottom: hasTabbar ? insets.bottom + 45 : insets.bottom,
    };
}
