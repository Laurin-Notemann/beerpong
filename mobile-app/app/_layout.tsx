import * as Sentry from '@sentry/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { createDrawerNavigator } from '@react-navigation/drawer';
import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from '@react-navigation/native';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { Host as PortalProvider } from 'react-native-portalize';
import 'react-native-reanimated';
import { RootSiblingParent } from 'react-native-root-siblings';

import { env } from '@/api/env';
import { ApiProvider } from '@/api/utils/create-api';
import { createQueryClient, persister } from '@/api/utils/query-client';
import { useRefetchEverythingOnWifiReconnect } from '@/api/utils/useRefetchEverythingOnWifiReconnect';
import { useModalStyles } from '@/app/navigation/modalStyles';
import LoadingScreen from '@/components/LoadingScreen';
import { Sidebar } from '@/components/screens/Sidebar';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTheme } from '@/theme';
import { LoggingProvider } from '@/utils/useLogging';

// https://sentry.io is a error reporting SaaS we use to remotely track production issues
Sentry.init(env.sentry);

const Drawer = createDrawerNavigator();

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function Everything() {
    const modalStyles = useModalStyles();
    return (
        <Stack initialRouteName="(tabs)">
            <Stack.Screen
                name="onboarding"
                options={{ title: '', headerShown: false }}
            />
            <Stack.Screen
                name="(tabs)"
                options={{ title: '', headerShown: false }}
            />
            <Stack.Screen name="+not-found" />

            <Stack.Screen name="createNewPlayer" options={modalStyles} />
            <Stack.Screen name="createNewRule" options={modalStyles} />
            <Stack.Screen name="rule" options={modalStyles} />
            <Stack.Screen name="allowedMove" options={modalStyles} />

            <Stack.Screen name="editRankPlayersBy" options={modalStyles} />
            <Stack.Screen
                name="dailyLeaderboardSettings"
                options={modalStyles}
            />
            <Stack.Screen name="teamSizeSettings" options={modalStyles} />
            <Stack.Screen
                name="minMatchesToQualifySettings"
                options={modalStyles}
            />

            <Stack.Screen
                name="createGroupCustomGameModal"
                options={modalStyles}
            />
            <Stack.Screen
                name="assignPointsToPlayerModal"
                options={modalStyles}
            />
            <Stack.Screen name="assignCupHitModal" options={modalStyles} />
            <Stack.Screen name="editMatchPoints" options={modalStyles} />
        </Stack>
    );
}

export default function RootLayout() {
    const theme = useTheme();
    const appTheme = useColorScheme() === 'dark' ? DarkTheme : DefaultTheme;

    const [fontLoaded] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    });
    const loaded = fontLoaded;

    const [queryClient] = useState(() => createQueryClient());

    useRefetchEverythingOnWifiReconnect(queryClient);

    useEffect(() => {
        if (loaded) SplashScreen.hideAsync();
    }, [loaded]);

    if (!loaded) return <LoadingScreen />;

    return (
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister }}
        >
            <LoggingProvider>
                <ApiProvider>
                    <ThemeProvider value={appTheme}>
                        <PortalProvider>
                            <RootSiblingParent>
                                <StatusBar barStyle={theme.barStyle} />
                                <Drawer.Navigator
                                    screenOptions={{
                                        drawerStyle: {
                                            width: 256,
                                        },
                                        headerShown: false,
                                    }}
                                    drawerContent={Sidebar}
                                >
                                    <Drawer.Screen
                                        name="static/aboutPremium"
                                        component={Everything}
                                    />
                                </Drawer.Navigator>
                            </RootSiblingParent>
                        </PortalProvider>
                    </ThemeProvider>
                </ApiProvider>
            </LoggingProvider>
        </PersistQueryClientProvider>
    );
}
