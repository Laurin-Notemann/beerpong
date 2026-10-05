import * as SplashScreen from 'expo-splash-screen';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { ErrorBoundary as ExpoErrorBoundary } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from 'expo-router/react-navigation';
import { useEffect, useState } from 'react';
import { Appearance, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Toaster } from 'sonner-native';

import { MatchQueue } from '@/api/calls/matchHooks';
import { resumeQueuedMatches } from '@/api/calls/matchQueue';
import { ApiProvider } from '@/api/utils/create-api';
import { createQueryClient, persistOptions } from '@/api/utils/query-client';
import { useRefetchEverythingOnWifiReconnect } from '@/api/utils/useRefetchEverythingOnWifiReconnect';
import { CrashFallback } from '@/components/CrashFallback';
import { Sidebar } from '@/components/screens/Sidebar';
import { useOtaUpdates } from '@/hooks/useOtaUpdates';
import { useSentryScreenTransactions } from '@/hooks/useSentryScreenTransactions';
import { useTheme } from '@/theme';
import { Sentry } from '@/utils/sentry';
import { LoggingProvider } from '@/utils/useLogging';
import { ScopePickerProvider } from '@/zustand/useScopePicker';

export const unstable_settings = { anchor: '(main)' };

// Render errors inside a route are reported with the route attached, and only that route shows
// the error UI (expo-router renders the exported boundary per route).
export const ErrorBoundary =
    Sentry.wrapExpoRouterErrorBoundary(ExpoErrorBoundary);

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayout() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    // The app picks light or dark itself (Settings → Appearance), not the system. Liquid Glass
    // tabs and headers resolve against the navigation theme and the native interface style, so
    // both follow the app's theme; otherwise a light-mode phone flashes white before going dark.
    const isDark = theme.barStyle === 'light-content';
    const appTheme = isDark ? DarkTheme : DefaultTheme;

    const [queryClient] = useState(() => createQueryClient());

    useRefetchEverythingOnWifiReconnect(queryClient);
    useOtaUpdates();
    useSentryScreenTransactions();

    useEffect(() => {
        SplashScreen.hideAsync();
    }, []);

    useEffect(() => {
        Appearance.setColorScheme(isDark ? 'dark' : 'light');
    }, [isDark]);

    return (
        // Catches render errors and fatal global errors (timers, handlers, native calls) for the
        // whole app: the event is sent to Sentry before the fallback replaces the crash.
        <Sentry.GlobalErrorBoundary
            fallback={({ error, eventId, resetError }) => (
                <CrashFallback
                    error={error}
                    eventId={eventId}
                    onRetry={resetError}
                />
            )}
        >
            <GestureHandlerRootView style={{ flex: 1 }}>
                <PersistQueryClientProvider
                    client={queryClient}
                    persistOptions={persistOptions}
                    onSuccess={() => resumeQueuedMatches(queryClient)}
                >
                    <LoggingProvider>
                        <ApiProvider>
                            <MatchQueue />
                            <ThemeProvider value={appTheme}>
                                <ScopePickerProvider>
                                    <StatusBar barStyle={theme.barStyle} />
                                    <Drawer
                                        screenOptions={{
                                            drawerStyle: { width: 256 },
                                            headerShown: false,
                                        }}
                                        drawerContent={Sidebar}
                                    >
                                        <Drawer.Screen name="(main)" />
                                    </Drawer>
                                    <Toaster
                                        theme={isDark ? 'dark' : 'light'}
                                        offset={insets.top + 52}
                                        duration={3000}
                                    />
                                </ScopePickerProvider>
                            </ThemeProvider>
                        </ApiProvider>
                    </LoggingProvider>
                </PersistQueryClientProvider>
            </GestureHandlerRootView>
        </Sentry.GlobalErrorBoundary>
    );
}

export default Sentry.wrap(RootLayout);
