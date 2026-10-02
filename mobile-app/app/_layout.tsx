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

import { ApiProvider, useApi } from '@/api/utils/create-api';
import { createQueryClient, persister } from '@/api/utils/query-client';
import { useRefetchEverythingOnWifiReconnect } from '@/api/utils/useRefetchEverythingOnWifiReconnect';
import { useModalStyles } from '@/app/navigation/modalStyles';
import LoadingScreen from '@/components/LoadingScreen';
import { Sidebar } from '@/components/screens/Sidebar';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useOtaUpdates } from '@/hooks/useOtaUpdates';
import { useTheme } from '@/theme';
import { Sentry } from '@/utils/sentry';
import { LoggingProvider } from '@/utils/useLogging';
import { useGroupStore } from '@/zustand/group/stateGroupStore';
import { ScopePickerProvider } from '@/zustand/useScopePicker';

const Drawer = createDrawerNavigator();

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function Everything() {
    const { connectRealtime } = useApi();

    const { groupIds } = useGroupStore();

    useEffect(() => {
        connectRealtime(groupIds);
    }, [groupIds]);

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
                name="cropAvatar"
                options={{
                    animation: 'fade',
                }}
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
                        </ScopePickerProvider>
                    </ThemeProvider>
                </ApiProvider>
            </LoggingProvider>
        </PersistQueryClientProvider>
    );
}

export default Sentry.wrap(RootLayout);
