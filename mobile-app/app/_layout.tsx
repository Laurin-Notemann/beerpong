import * as SplashScreen from 'expo-splash-screen';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { ErrorBoundary as ExpoErrorBoundary } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from 'expo-router/react-navigation';
import { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Host as PortalProvider } from 'react-native-portalize';
import 'react-native-reanimated';
import { RootSiblingParent } from 'react-native-root-siblings';

import { ApiProvider } from '@/api/utils/create-api';
import { createQueryClient, persister } from '@/api/utils/query-client';
import { useRefetchEverythingOnWifiReconnect } from '@/api/utils/useRefetchEverythingOnWifiReconnect';
import { CrashFallback } from '@/components/CrashFallback';
import LoadingScreen from '@/components/LoadingScreen';
import { Sidebar } from '@/components/screens/Sidebar';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useOtaUpdates } from '@/hooks/useOtaUpdates';
import { useTheme } from '@/theme';
import { Sentry } from '@/utils/sentry';
import { LoggingProvider } from '@/utils/useLogging';
import { ScopePickerProvider } from '@/zustand/useScopePicker';

export const unstable_settings = { initialRouteName: '(main)' };

// Render errors inside a route are reported with the route attached, and only that route shows
// the error UI (expo-router renders the exported boundary per route).
export const ErrorBoundary =
    Sentry.wrapExpoRouterErrorBoundary(ExpoErrorBoundary);

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayout() {
    const theme = useTheme();
    const appTheme = useColorScheme() === 'dark' ? DarkTheme : DefaultTheme;

    const [fontLoaded] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    });
    const loaded = fontLoaded;

    const [queryClient] = useState(() => createQueryClient());

    useRefetchEverythingOnWifiReconnect(queryClient);
    useOtaUpdates();

    useEffect(() => {
        if (loaded) SplashScreen.hideAsync();
    }, [loaded]);

    if (!loaded) return <LoadingScreen />;

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
                    persistOptions={{ persister }}
                >
                    <LoggingProvider>
                        <ApiProvider>
                            <ThemeProvider value={appTheme}>
                                <ScopePickerProvider>
                                    <PortalProvider>
                                        <RootSiblingParent>
                                            <StatusBar
                                                barStyle={theme.barStyle}
                                            />
                                            <Drawer
                                                screenOptions={{
                                                    drawerStyle: { width: 256 },
                                                    headerShown: false,
                                                }}
                                                drawerContent={Sidebar}
                                            >
                                                <Drawer.Screen name="(main)" />
                                            </Drawer>
                                        </RootSiblingParent>
                                    </PortalProvider>
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
