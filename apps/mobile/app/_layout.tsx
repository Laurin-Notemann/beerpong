import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { ErrorBoundary as ExpoErrorBoundary } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from 'expo-router/react-navigation';
import * as SplashScreen from 'expo-splash-screen';
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
// iOS runs these when the app is woken in the background, so they load first: the Live
// Activity's layout for the API's pushes, and the task that updates the widget from them
import '@/lib/widgets/LiveMatchActivity';
import '@/lib/widgets/liveScoresTask';
import { useTheme } from '@/theme';
import { ScopedLogger } from '@/utils/logging';
import { Sentry } from '@/utils/sentry';
import { LoggingProvider } from '@/utils/useLogging';
import { ScopePickerProvider } from '@/zustand/useScopePicker';

export const unstable_settings = { anchor: '(main)' };

const logger = new ScopedLogger('root-layout');

// Render errors inside a route are reported with the route attached, and only that route shows
// the error UI (expo-router renders the exported boundary per route).
export const ErrorBoundary =
    Sentry.wrapExpoRouterErrorBoundary(ExpoErrorBoundary);

// Prevent the splash screen from auto-hiding before asset loading is complete.
void SplashScreen.preventAutoHideAsync().catch((err: unknown) =>
    logger.error('failed to keep the splash screen visible', err)
);

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
        void SplashScreen.hideAsync().catch((err: unknown) =>
            logger.error('failed to hide the splash screen', err)
        );
    }, []);

    useEffect(() => {
        Appearance.setColorScheme(isDark ? 'dark' : 'light');
    }, [isDark]);

    return (
        // Catches render errors and fatal global errors (timers, handlers, native calls) for the
        // whole app: the event is sent to Sentry before the fallback replaces the crash.
        <Sentry.GlobalErrorBoundary
            fallback={(crash) => (
                <CrashFallback
                    error={crash.error}
                    eventId={crash.eventId}
                    onRetry={() => crash.resetError()}
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
