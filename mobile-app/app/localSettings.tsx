import { Stack } from 'expo-router';
import React from 'react';
import { ScrollView } from 'react-native';

import { navStyles } from '@/app/navigation/navStyles';
import { useNavigation } from '@/app/navigation/useNavigation';
import { useInsets } from '@/app/useInsets';
import MenuItem from '@/components/Menu/MenuItem';
import MenuSection from '@/components/Menu/MenuSection';
import { theme } from '@/theme';
import { useTutorials } from '@/zustand/tutorialStore';

export default function Page() {
    const nav = useNavigation();

    const tutorials = useTutorials();

    const insets = useInsets(true);

    return (
        <>
            <Stack.Screen
                options={{
                    ...navStyles,
                    headerTitle: 'Settings',
                }}
            />
            <ScrollView
                style={{
                    flex: 1,

                    backgroundColor: theme.color.bg,
                }}
                contentContainerStyle={{
                    paddingTop: insets.top,
                    paddingHorizontal: 16,

                    paddingBottom: 128,
                }}
            >
                <MenuSection title="Development">
                    <MenuItem
                        title="Experimental Features"
                        headIcon="flask-outline"
                        tailIconType="next"
                        onPress={() => nav.navigate('experimentalFeatures')}
                    />
                    <MenuItem
                        title="Reset Tutorials"
                        headIcon="flask-outline"
                        tailIconType="next"
                        onPress={tutorials.reset}
                    />
                </MenuSection>
            </ScrollView>
        </>
    );
}
