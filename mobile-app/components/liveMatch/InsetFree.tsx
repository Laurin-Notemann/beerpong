import { HeaderHeightContext } from 'expo-router/react-navigation';
import { PropsWithChildren } from 'react';
import {
    SafeAreaInsetsContext,
    useSafeAreaInsets,
} from 'react-native-safe-area-context';

/**
 * For content that sits between other content instead of under the header or at the screen's
 * edge: components inside that pad themselves with `useInsets` get zero top and bottom
 * insets. The live match screen puts the entry pages between its scoreboard and finish bar.
 */
export function InsetFree({ children }: PropsWithChildren) {
    const insets = useSafeAreaInsets();

    return (
        <HeaderHeightContext.Provider value={0}>
            <SafeAreaInsetsContext.Provider
                value={{ ...insets, top: 0, bottom: 0 }}
            >
                {children}
            </SafeAreaInsetsContext.Provider>
        </HeaderHeightContext.Provider>
    );
}
