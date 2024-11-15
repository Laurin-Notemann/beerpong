import { Stack, useNavigation } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import MatchPlayers from '@/components/MatchPlayers';
import MatchVsHeader from '@/components/MatchVsHeader';
import { mockMatches } from '@/components/mockData/matches';
import { theme } from '@/theme';

import { HeaderItem } from './(tabs)/_layout';

export default function Page() {
    const navigation = useNavigation();

    const [isEditing, setIsEditing] = useState(false);

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
                                setIsEditing((prev) => !prev);
                            }}
                        >
                            {isEditing ? 'Done' : 'Edit'}
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
                <MatchPlayers editable={isEditing} />
            </ScrollView>
        </>
    );
}
