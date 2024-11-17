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

import { ApiProvider } from '@/api/utils/create-api';
import { createQueryClient, persister } from '@/api/utils/query-client';
import { Sidebar } from '@/components/screens/Sidebar';
import { useColorScheme } from '@/hooks/useColorScheme';
import { theme } from '@/theme';

import { HeaderItem, navStyles } from './(tabs)/_layout';

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
                <Stack.Screen
                    name="formations"
                    options={{
                        ...navStyles,
                        headerTitle: 'Formations',
                        headerRight: () => <HeaderItem>Edit</HeaderItem>,
                        headerTintColor: 'white',
                        headerBackTitle: '',
                    }}
                />
                <Stack.Screen
                    name="editFormation"
                    options={{
                        ...navStyles,
                        headerTitle: 'Edit Formation',
                        headerRight: () => <HeaderItem>Done</HeaderItem>,
                        headerTintColor: 'white',
                        headerBackTitle: '',
                    }}
                />
                <Stack.Screen
                    name="pastSeasons"
                    options={{
                        ...navStyles,
                        headerTitle: 'Past Seasons',
                        headerRight: () => <HeaderItem>Done</HeaderItem>,
                        headerTintColor: 'white',
                        headerBackTitle: '',
                    }}
                />
                <Stack.Screen
                    name="player"
                    options={{
                        ...navStyles,
                        headerTintColor: 'white',
                        headerBackTitle: '',
                    }}
                />
                <Stack.Screen
                    name="createNewPlayer"
                    options={{
                        presentation: 'modal',
                        ...navStyles,
                        headerTitle: 'Create new Player',
                        headerLeft: () => <HeaderItem>Cancel</HeaderItem>,
                        headerRight: () => <HeaderItem>Create</HeaderItem>,
                        headerTintColor: 'white',
                        headerBackTitle: '',
                    }}
                />

                <Stack.Screen
                    name="editRankPlayersBy"
                    options={{
                        presentation: 'modal',

                        // headerLeft: () => <HeaderItem noMargin>Back</HeaderItem>,
                        headerRight: () => (
                            <HeaderItem noMargin>Done</HeaderItem>
                        ),

                        headerTitle: 'Rank Players By',
                        headerBackTitle: '',
                        headerBackVisible: true,
                        headerTintColor: 'white',

                        headerStyle: {
                            backgroundColor: '#1B1B1B',
                        },
                        headerTitleStyle: {
                            color: theme.color.text.primary,
                        },
                    }}
                />
            </Stack>
        </ThemeProvider>
    );
}

function DrawerContent() {
    return <Sidebar appVersion="0.1.0" />;
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
                <Drawer.Navigator
                    screenOptions={{
                        drawerStyle: {
                            width: 256,
                        },
                        headerShown: false,
                    }}
                    drawerContent={DrawerContent}
                >
                    <Drawer.Screen name="aboutPremium" component={Everything} />
                </Drawer.Navigator>
            </ApiProvider>
        </PersistQueryClientProvider>
    );
}
