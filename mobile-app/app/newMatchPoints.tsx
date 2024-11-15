import { Stack, useNavigation } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';

import Button from '@/components/Button';
import MatchPlayers from '@/components/MatchPlayers';
import MatchVsHeader from '@/components/MatchVsHeader';
import { mockMatches } from '@/components/mockData/matches';
import { theme } from '@/theme';

import { HeaderItem } from './(tabs)/_layout';

export default function Page() {
    const navigation = useNavigation();

    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Match',
                    headerStyle: {
                        backgroundColor: theme.color.topNav,

                        // @ts-ignore
                        elevation: 0, // For Android
                        shadowOpacity: 0, // For iOS
                        borderBottomWidth: 0, // Removes the border for both platforms
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                    headerRight: () => (
                        <HeaderItem
                            onPress={() => {
                                // @ts-ignore
                                navigation.navigate('matches');
                            }}
                        >
                            Create
                        </HeaderItem>
                    ),
                    headerTitle: () => (
                        <MatchVsHeader
                            match={mockMatches[0]}
                            style={{
                                bottom: 4,
                            }}
                        />
                    ),
                }}
            />
            <ScrollView
                style={{
                    flex: 1,

                    backgroundColor: theme.color.bg,
                }}
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: 32,
                    paddingBottom: 32,
                }}
            >
                <Button
                    variant="default"
                    title="Start Live Match"
                    size="small"
                    // @ts-ignore
                    onPress={() => navigation.navigate('startLiveMatch')}
                />
                <MatchPlayers editable />
            </ScrollView>
        </>
    );
}
