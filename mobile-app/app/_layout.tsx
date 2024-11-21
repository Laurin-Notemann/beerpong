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
import 'react-native-reanimated';
import { RootSiblingParent } from 'react-native-root-siblings';

import { env } from '@/api/env';
import { ApiProvider } from '@/api/utils/create-api';
import { createQueryClient, persister } from '@/api/utils/query-client';
import LoadingScreen from '@/components/LoadingScreen';
import { Sidebar } from '@/components/screens/Sidebar';
import { useColorScheme } from '@/hooks/useColorScheme';

import { modalStyles } from './navigation/modalStyles';

// https://sentry.io is a error reporting SaaS we use to remotely track production issues
Sentry.init(env.sentry);

const Drawer = createDrawerNavigator();

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function Everything() {
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

            <Stack.Screen name="editRankPlayersBy" options={modalStyles} />
        </Stack>
    );
}

export default function RootLayout() {
    const appTheme = useColorScheme() === 'dark' ? DarkTheme : DefaultTheme;

    const [fontLoaded] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    });
    const loaded = fontLoaded;

    const [queryClient] = useState(() => createQueryClient());

    useEffect(() => {
        if (loaded) SplashScreen.hideAsync();
    }, [loaded]);

    if (!loaded) return <LoadingScreen />;

    return (
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister }}
        >
            <ApiProvider>
                <ThemeProvider value={appTheme}>
                    <RootSiblingParent>
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
                </ThemeProvider>
            </ApiProvider>
        </PersistQueryClientProvider>
    );
}
