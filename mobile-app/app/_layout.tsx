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
import { Sidebar } from '@/components/screens/Sidebar';
import { useColorScheme } from '@/hooks/useColorScheme';

import { modalStyle } from './navigation/navStyles';

const Drawer = createDrawerNavigator();

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function Everything() {
    const colorScheme = useColorScheme();

    return (
        <ThemeProvider
            value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
        >
            <Stack initialRouteName="(tabs)">
                <Stack.Screen
                    name="onboarding"
                    options={{
                        title: '',
                        headerShown: false,
                    }}
                />
                <Stack.Screen
                    name="(tabs)"
                    options={{
                        title: '',
                        headerShown: false,
                    }}
                />
                <Stack.Screen name="+not-found" />

                <Stack.Screen name="createNewPlayer" options={modalStyle} />

                <Stack.Screen name="editRankPlayersBy" options={modalStyle} />
            </Stack>
        </ThemeProvider>
    );
}

function DrawerContent() {
    return <Sidebar appVersion={env.appVersion} />;
}

export default function RootLayout() {
    const [loaded] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    });

    const [queryClient] = useState(() => createQueryClient());

    useEffect(() => {
        if (loaded) {
            SplashScreen.hideAsync();
        }
    }, [loaded]);

    if (!loaded) {
        return null;
    }

    return (
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister }}
        >
            <ApiProvider>
                <RootSiblingParent>
                    <Drawer.Navigator
                        screenOptions={{
                            drawerStyle: {
                                width: 256,
                            },
                            headerShown: false,
                        }}
                        drawerContent={DrawerContent}
                    >
                        <Drawer.Screen
                            name="aboutPremium"
                            component={Everything}
                        />
                    </Drawer.Navigator>
                </RootSiblingParent>
            </ApiProvider>
        </PersistQueryClientProvider>
    );
}
